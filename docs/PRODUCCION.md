# Operación autenticada y conector v1

## Alcance implementado

Modo `live`: autenticación por contraseña derivada con scrypt y sesiones opacas de ocho horas persistidas como hashes; cookies HttpOnly/SameSite=Strict/Secure en producción; validación de Origin en escrituras del navegador; restricción inicial de intentos de login. Cada usuario tiene restaurante y rol `owner` o `viewer`. Ambos pueden consultar y exportar su restaurante. Las escrituras operativas se reservan a credenciales de conector por canal y restaurante. La provisión de cuentas es una operación administrativa local, no un endpoint público.

Sin `APP_MODE=demo`, no existe acceso anónimo a datos. La demo es explícita y el seed nunca corre en live. En producción live se exige PostgreSQL y un `PUBLIC_ORIGIN` HTTPS. PostgreSQL verifica certificados TLS; configurar la CA del proveedor en el entorno si es privada, sin desactivar la validación.

## Preparación

1. Configurar `APP_MODE=live`, `NODE_ENV=production`, `DATABASE_URL`, `PUBLIC_ORIGIN=https://tu-dominio` y `ALLOW_RESEED=false`. `PUBLIC_ORIGIN` es el origen exacto sin slash final. Usar `TRUST_PROXY=true` solo si hay un proxy controlado y el servidor no acepta tráfico que lo evite.
2. Guardar secretos de conector en `CONNECTOR_KEYS`, un array JSON con objetos `token` (aleatorio de al menos 32 caracteres), `restaurantId` y `channel` (`uber_eats`, `opentable`, `whatsapp` o `mips`). Cada clave permite solo su canal/restaurante. Cambiar/eliminar la clave en el gestor de secretos y reiniciar revoca el acceso correspondiente.
3. Aprovisionar usuarios con `npm run user:create`, pasando por entorno `PROVISION_RESTAURANT_ID`, `PROVISION_RESTAURANT_NAME`, `PROVISION_EMAIL`, `PROVISION_PASSWORD` (mínimo 14 caracteres), `PROVISION_ROLE=owner|viewer`. No pasar contraseñas por argumentos de shell, publicarlas ni versionarlas. El script inserta; no sobrescribe usuarios existentes.
4. Ejecutar lint, typecheck, test:audit, test:production y build; arrancar con las variables anteriores. El arranque aplica DDL aditivo. Revisar y respaldar una base real antes de su primera actualización. Las pruebas de este cambio solo usan bases en memoria.

La UI solicita login en `/inicio`; `POST /api/auth/login` recibe email/password y crea la cookie. `POST /api/auth/logout` revoca esa sesión. No se crean usuarios por seed. El origen del navegador debe coincidir con PUBLIC_ORIGIN.

## Contrato normalizado

`POST /api/connector/events`, `Authorization: Bearer <secreto>`, JSON:

```json
{
  "event_id": "order-event-001",
  "channel": "uber_eats",
  "event_type": "order",
  "payload_version": "1",
  "created_at": "2026-10-06T18:00:00Z",
  "payload": {
    "external_id": "order-001",
    "status": "confirmed",
    "amount": 2000,
    "items": [{ "product_id": "p-001", "name": "Producto", "quantity": 2, "unit_price": 1000 }]
  }
}
```

Importes enteros en centavos, fechas ISO con zona. El total debe igualar líneas; cargos, descuentos e impuestos que el proveedor incluya en el total deben normalizarse en líneas explícitas. Se rechazan fechas más de cinco minutos en el futuro. La versión 1 acepta registros iniciales inmutables; no representa cancelaciones posteriores, devoluciones o ajustes: requieren ampliar el contrato, no sobrescribir registros sin historial.

| event_type | Canal autorizado | Payload |
|---|---|---|
| order | uber_eats | external_id, status confirmed/cancelled, amount, items |
| pos_confirmation | mips | order_external_id, folio, amount |
| reservation | opentable | external_id, party_size, reserved_for, status |
| conversation | whatsapp | external_id, intent, first_response_seconds opcional |
| message | whatsapp | external_id, conversation_external_id, direction in/out, template_name y delivered_at/read_at/replied_at opcionales |
| message_status | whatsapp | message_external_id, status delivered/read/replied; created_at es la fecha observada del estado |
| conversation_stage | whatsapp | conversation_external_id, stage intent/request/conversion; conversion requiere target_type order/reservation y target_external_id existente en el restaurante |

Respuesta: `{ "status": "pending|confirmed", "mips_folio": null, "duplicate": false }`. Un pedido confirmado por el canal queda pendiente del POS. La confirmación de Míps verifica pedido, importe, estado y folio, inserta la venta y actualiza pedido/evento en la misma transacción. El folio nunca se genera aquí. Los bloqueos y claves deterministas impiden dos folios para un pedido o un folio para dos pedidos bajo concurrencia.

Idempotencia: mismo restaurante/canal/event_id y contenido normalizado devuelve el estado almacenado con duplicate=true. Cambiar contenido manteniendo event_id da 409. Si falla la normalización, se revierte evento y datos de dominio. Ante 409 por dependencia ausente, el emisor debe enviar primero la dependencia y reintentar; no hay cola externa ni ejecutable local implementado. No reintentar indefinidamente errores de validación 400 o autorización 401/403.

## Qué significan las métricas

- **Confirmado por canal:** pedido confirmed y no cancelado; no prueba registro en POS.
- **Conciliado:** además existe venta POS del mismo restaurante/pedido, con folio e importe iguales. Ventas, ticket y productos conciliados comparten esta definición. Se agrupan por fecha del pedido; pedidos por día cuenta todos los estados y suma exactamente el KPI de pedidos.
- **Clientes:** historial acumulado. Directorio de 100 en 100 y CSV completo por lotes de 500.
- **Conciliación:** eventos del periodo elegido, páginas de 100; CSV completo por lotes de 500. Los lotes se leen durante la exportación; no constituyen un snapshot congelado frente a escrituras concurrentes.
- **WhatsApp:** plantillas agregadas desde mensajes enviados en el periodo; etapas observadas por fecha del evento y conversación distinta. Etapas no implican un embudo secuencial. Las conversiones del resumen de conversaciones corresponden a la cohorte iniciada en el periodo.
- **Demanda:** mapa de 24 horas de Ciudad de México; menor actividad de tarde se divide por exposición de cada día en la ventana, exige dos exposiciones por día y 30 eventos. El periodo personalizado incluye todo el día civil de México y se limita a 366 días.

## Monitoreo

`POST /api/connector/heartbeat` con la misma credencial y `{ "status": "connected", "message": "Conector disponible" }` (o status error). El servidor fija checkedAt al recibirlo. Enviar antes de dos minutos; pasado ese umbral Salud indica atención. Sin heartbeat indica ausencia de señal. Es un autorreporte autenticado del conector, **no** uptime del proveedor ni SLA. El conector externo debe hacer su prueba de acceso al POS/proveedor antes de reportar connected. La demo nunca informa conectividad real.

## Evidencia y límites

Pruebas automatizadas: aislamiento entre dos restaurantes, sesiones/logout/expiración, Origin, claves por canal, reintentos, rollback, conciliación, 1,001 clientes exportados, más de 200 eventos paginados, estados de mensaje, etapas observadas y vencimiento de heartbeat. Benchmark local de cinco solicitudes de insights sobre fixture sintético: 52–70 ms en una ejecución (1,001 clientes, 208 eventos más eventos WhatsApp; PGlite). No es prueba de carga, SLA ni resultado de PostgreSQL real. Se evita añadir caché sin evidencia de necesidad; el estado de salud ya no carga todos los eventos de siete días por canal.

Para activar una instalación real faltan contrato/credenciales y adaptador del POS/proveedores, prueba extremo a extremo en staging, estrategia de actualizaciones/cancelaciones/reembolsos, backups/recuperación y configuración operacional de alertas. El limitador de login es por proceso; usar rate limiting compartido en el proxy antes de un despliegue de varias instancias. No se ha desplegado ni se han modificado bases externas.
