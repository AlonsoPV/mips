# Auditoría de valor y funcionalidad — Míps Connect

Fecha: 6 de octubre de 2026. Alcance: revisión del código local, API, cálculos, interfaz y compilación. Se conservaron los cambios que ya existían en el workspace. No se entrevistó a clientes ni se conectaron servicios externos.

## Dictamen

**Modo autenticado y controles internos implementados; valor económico todavía no demostrado.** El producto reúne información de restaurante y puede ayudar a detectar incidencias, revisar ventas y priorizar seguimiento. La demo usa seed. El modo live recibe eventos autenticados y normaliza datos; los adaptadores de proveedores externos aún requieren contrato e instalación. No demuestra integración operativa, recuperación de ventas, envío de campañas ni ahorro efectivo. No debe venderse como operación productiva lista.

La propuesta más concreta es: localizar pedidos que requieren atención y contrastar su registro en Míps, con trazabilidad y un siguiente paso. Las gráficas y recomendaciones tienen valor si cambian una decisión verificable; el número de pantallas no valida ese valor.

## Evaluación por función

| Función | Valor potencial para el cliente | Evidencia actual | Decisión |
|---|---|---|---|
| Inicio y ventas | Revisar ingresos, ticket y excepciones sin cambiar de sistema | Agregaciones persistentes y comparación de periodos | Conservar; conciliar contra datos reales antes de prometer precisión financiera |
| Salud y eventos | Identificar pendientes y fallos | Lista y conteos; no ejecuta recuperación real | Prioridad del MVP; completar resolución y trazabilidad |
| Reservaciones | Preparar capacidad y estudiar cancelaciones | Datos demo; sin disponibilidad ni gestión real de mesas | Conservar como análisis, validar con gerente |
| WhatsApp | Medir respuesta y consultas | Conversaciones demo y conversiones marcadas en seed | Conservar métricas observadas; retirar pasos estimados del embudo |
| Clientes | Detectar recurrencia y posibles audiencias | Segmentos y gasto precalculados; muestra pequeña | Mantener como exploración, no como CRM completo |
| Marketing | Sugerir pruebas comerciales | Reglas; no crea ni envía campañas | Simplificar a oportunidades con evidencia, responsable y resultado |
| Reportes y CSV | Compartir un corte | Descargas operativas, algunas parciales | Conservar; explicitar alcance y completar exportaciones |
| Hub y Configuración | Explicar integraciones durante una venta | Repite salud y estado de canales | Reducir duplicación cuando se valide la navegación con usuarios |

## Funcionalidad “basura” o de bajo valor

Aquí significa contenido que no facilita una decisión, duplica información o aparenta una capacidad inexistente; no significa que deba borrarse automáticamente.

Estado actualizado tras aplicar las correcciones solicitadas:

1. **Métricas de disponibilidad y sincronización — corregido.** No se publica un porcentaje de disponibilidad inventado. La antigüedad procede del último registro y, si no existe, se devuelve `null` y la interfaz muestra ausencia de registros. Inicio ya no presenta ese registro como actualización de todos los datos.
2. **Embudo WhatsApp — corregido.** Se retiraron `intencion` y `solicitud` del contrato y de la pantalla. Solo se muestran conversaciones y conversiones registradas. Las plantillas indican que sus totales son históricos y no responden al filtro de periodo.
3. **Productos por nombre — corregido.** Se sustituyeron las reglas Angus/rib eye por una regla independiente del nombre: al menos 10 pedidos confirmados y ticket asociado al menos 10% mayor que el promedio. Se elige por ventas entre los candidatos. La evidencia muestra muestra y ticket en MXN, aclara asociación y recomienda revisar costes antes de promocionar. No se estima margen porque el dataset no contiene costes. Estos umbrales son heurísticos, no significancia estadística ni rentabilidad demostrada.
4. **Pantallas repetidas — simplificado.** Inicio conserva el resumen y Salud concentra incidencias. `/hub` redirige a Salud para conservar enlaces existentes y desaparece como opción duplicada del menú. Configuración pasa a Integraciones, con fuentes, requisitos reales y controles de demo; ya no repite KPIs ni prioridades. Reportes es un catálogo de cortes y CSV, sin otro dashboard de prioridades. Su detalle conserva los datos del reporte. La navegación simplificada sigue pendiente de validación con clientes.
5. **Autenticación aparente — retirada.** Se eliminaron login/logout, `/api/auth/me`, asignación automática de usuario y sesiones del servidor. `/api/demo/context` identifica explícitamente la demostración pública. Se retiraron dependencias y variables de sesión/contraseña y ya no se genera un usuario de login en el seed. Las tablas históricas se conservan para no migrar ni destruir datos existentes. La etapa posterior incorporó autenticación efectiva solo en modo live; ver la tabla de implementación y PRODUCCION.md.
6. **Clientes aparentemente temporales — corregido el alcance.** El contrato declara `scope: cumulative`; la función deja de aceptar un periodo. La pantalla identifica historial acumulado y no ofrece selector temporal, tampoco las fichas ni el reporte de clientes. Marketing consulta ese acumulado por separado de los productos del periodo. Reportes identifica el alcance histórico; la etapa posterior amplió el CSV al padrón completo y añadió directorio paginado. No se inventan métricas históricas por periodo a partir de totales precalculados.

## Correcciones aplicadas

- Fechas inválidas, incompletas o invertidas devuelven 400; no llegan como fechas inválidas a SQL.
- Express 4 canaliza excepciones de handlers asíncronos a respuestas JSON y oculta detalles internos en el 500.
- `limit` de eventos rechaza NaN, infinito, fracciones y valores negativos; conserva el máximo de 100.
- Conector valida canal, fecha ISO y monto entero no negativo. Identificador SHA-256 por restaurante/canal/evento e inserción con conflicto controlado evitan duplicados concurrentes y truncamientos de ID. Folio claramente DEMO y respuesta marcada como demo. El primer evento recibido prevalece en reintentos.
- Regenerar datos exige `ALLOW_RESEED=true`, incluso en desarrollo. Una configuración falsa ya no queda ignorada.
- El hook de consultas cancela peticiones anteriores y evita que respuestas tardías sobrescriban el periodo actual.
- Motor de recomendaciones tolera ausencia de intención de reservación, elimina una consulta completa de OpenTable que no utilizaba y filtra Marketing antes de limitar resultados.
- Resumen de demanda describe actividad combinada; ya no atribuye un pico combinado a un canal concreto. Periodos vacíos no inventan un pico.
- Ticket asociado por producto promedia pedidos confirmados completos, una vez por pedido/producto; antes era importe por unidad.
- Mensajes enviados/leídos usan fecha del mensaje, y lectura compara contra el periodo anterior real.
- Eventos procesados cuenta confirmados; el inicio del día usa Ciudad de México y no la zona horaria del servidor.
- Ficha de cliente acota restaurante y ordena actividad por fecha descendente.
- CSV escapa retornos de carro y neutraliza prefijos de fórmula en texto.

## Pendientes que impiden producción o pueden confundir

| Prioridad | Cambio implementado | Validación / límite |
|---|---|---|
| P0 | Modo live por defecto, sesión persistida, scrypt, Origin, roles y contexto de restaurante por solicitud | Dos restaurantes aislados; logout y expiración. Demo solo explícita; falta operación de identidad a escala según despliegue |
| P0 | Tokens por restaurante/canal, contrato v1, normalización transaccional e idempotencia; confirmación POS valida importe/folio/pedido | Reintentos y rollback pasan. Adaptador/llamada real al POS pendiente de documentación y credenciales |
| P1 | Directorio de clientes paginado y CSV completo; conciliación por periodo con páginas de 100 y exportación por lotes | 1,001 clientes exportados; más de 200 eventos y todas las páginas comprobadas. No snapshot frente a escrituras concurrentes |
| P2 | Etapas de conversación y estados de mensaje explícitos; plantillas derivadas de mensajes del periodo | La instrumentación solo cuenta eventos recibidos; no inventa etapas. Adaptador externo debe emitirlos |
| P1 | Ventas de canal separadas de ventas conciliadas; conciliación exige POS del mismo pedido, restaurante, folio e importe | Pedido confirmado sin POS aporta cero a ventas conciliadas; importe incorrecto se rechaza |
| P1 | Pedidos diarios incluye todos los estados; ventas/productos/ticket usan la misma definición conciliada | Suma diaria igual a KPI y cancelados excluidos de ventas/productos |
| P1 | Menor actividad de tarde normalizada por exposición de cada día y ventana | Mínimo dos ventanas por día y 30 eventos; prueba con distinta cantidad de días sin falso descenso |
| P1 | Mapa de 24 horas en API e interfaz | 168 celdas; comprobación de navegador |
| P2 | Heartbeat autenticado por canal, vencimiento de dos minutos y ausencia de señal explícita | Autorreportado por conector; no se anuncia SLA ni se infiere conectividad desde actividad antigua |
| P2 | Medición de insights y eliminación del escaneo de siete días por cada canal al consultar salud | Fixture local: cinco lecturas de 52–70 ms; sin caché global que mezcle restaurantes ni datos obsoletos |

Detalles de activación, contratos y límites: [PRODUCCION.md](PRODUCCION.md). No se hizo despliegue ni se modificaron bases externas. **Sigue pendiente la conexión real al POS/proveedores, su validación en staging y el endurecimiento operativo del despliegue.** El contrato v1 es de ingreso inicial y confirmación; ajustes posteriores, cancelaciones de pedidos ya ingresados y reembolsos requieren un contrato adicional.

## Cómo validar valor con el cliente

Propuesta de piloto, no resultados obtenidos: medir una línea base durante una semana y operar el flujo de incidencias durante dos semanas con los mismos restaurantes y definiciones. Ajustar duración si el volumen no permite comparar.

| Hipótesis | Medición | Criterio propuesto para acordar con el cliente |
|---|---|---|
| Reduce trabajo manual | Minutos diarios conciliando, medidos antes/después | Al menos 30% menos tiempo con cobertura equivalente |
| Evita operaciones perdidas | Pedidos únicos de origen vs POS; pendientes resueltos y monto recuperado | 100% de la muestra reconciliable y ninguna duplicación por reintento |
| Ayuda a decidir | Gerente identifica problema, evidencia y siguiente acción en una sesión | 4 de 5 participantes completan la tarea en menos de 2 minutos |
| Reactivación aporta margen | Grupo contactado con consentimiento vs grupo de control, conversiones vinculadas y margen | Margen incremental superior al coste de campaña; sin confundir correlación con atribución |
| Hay disposición a pagar | Continuidad y oferta de piloto pagado | Compromiso explícito de un cliente, no solo comentarios positivos |

Beneficio mensual estimado = horas ahorradas × coste/hora + margen recuperado atribuible − coste de operación e integraciones. ROI = (beneficio bruto atribuible − coste total) / coste total. Evitar contabilizar dos veces la misma recuperación y no usar ventas brutas como beneficio. Faltan horas, márgenes, costes y evidencia de atribución para calcularlo hoy.

## Validación técnica

Se agregó `npm run test:audit` (`scripts/audit-check.ts`), con PGlite en memoria: no modifica el dataset local. Cubre endpoints principales, errores de entrada, periodo vacío, intención ausente, idempotencia concurrente, payloads inválidos, conteo de procesados y ocho exportaciones CSV.

Lint y TypeScript sin errores. Compilación de cliente y servidor comprobada. La primera compilación dentro del sandbox falló por permisos de lectura de Windows; fuera del sandbox completó. El launcher global de npm también apunta a una ruta inexistente; se usó directamente el npm instalado en Program Files.

Límites: no hubo QA visual en navegador, pruebas de concurrencia del hook React, carga sostenida, PostgreSQL externo, integraciones reales ni validación comercial con clientes. Pasar estas pruebas no acredita ausencia total de bugs ni seguridad productiva.

## Regresión de la simplificación

`npm run test:audit` pasó con 28 lecturas HTTP, ocho descargas CSV, reintentos concurrentes y validación de payloads. Se añadieron comprobaciones de ausencia de cookies y endpoints de login/logout, contexto demo, embudo sin etapas inventadas, alcance acumulado de clientes, ausencia de sincronización y selección de productos con nombres arbitrarios y umbral de muestra. TypeScript y ESLint pasaron antes de compilar. Las pruebas usan exclusivamente PGlite en memoria.

## Validación de los controles de producción

Pruebas `test:production` y `test:audit` sobre PGlite en memoria, sin datos externos. La primera usa usuarios de dos restaurantes y no depende del seed. Se comprobó en navegador la aplicación compilada, el mapa de 24 horas y la paginación del reporte de conciliación. El análisis económico continúa pendiente de un piloto real; los tiempos de respuesta locales no prueban capacidad de producción.
