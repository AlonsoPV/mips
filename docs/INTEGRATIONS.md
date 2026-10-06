# Integraciones reales — de demo a productivo

Míps Connect **no implementa** llamadas a Uber Eats, OpenTable, WhatsApp ni al conector local de Míps en esta fase. Los `Mock*Adapter` generan e interpretan datos ya persistidos. Esta guía explica cómo sustituirlos sin rehacer dashboards.

## Flujo objetivo

```
Fuente (API / webhook / archivo / conector)
  → ChannelAdapter
  → normalización a integration_events
  → tablas de dominio (orders, reservations, conversations, pos_sales)
  → API interna /api/*
  → UI
```

La UI jamás debe importar un adapter.

## Contrato del adapter

```ts
interface ChannelAdapter {
  getEvents(from: Date, to: Date): Promise<NormalizedEvent[]>;
  getOrders?(from: Date, to: Date): Promise<unknown[]>;
  getReservations?(from: Date, to: Date): Promise<unknown[]>;
  getMessages?(from: Date, to: Date): Promise<unknown[]>;
  healthCheck(): Promise<ChannelHealth>;
}
```

`NormalizedEvent` vive en `server/adapters/types.ts`. `raw_metadata` se guarda en DB y **no** se expone en la API de UI.

## Uber Eats

Sustituir `MockUberEatsAdapter` por un adapter que:

- Reciba webhooks de pedidos o consulte la API oficial de Uber Eats **con credenciales del restaurante**.
- Mapee pedido → `orders` + `order_items` + `order_modifiers`.
- Escriba `integration_events` con `channel = uber_eats`, `event_type = order`.
- Asigne `mips_folio` solo cuando el conector Míps confirme la venta.

No simular una API de Uber si no está contratada. No hacer scraping de Merchant Portal.

## OpenTable

Sustituir `MockOpenTableAdapter` cuando exista **acceso autorizado**.

- Reservaciones → `reservations`.
- No asumir campos (recurrencia, no-show, customer_id) si el contrato no los entrega.
- La UI ya muestra: “Disponibilidad sujeta al acceso autorizado de OpenTable.”

## WhatsApp Business Cloud API

Sustituir `MockWhatsAppAdapter`:

- Webhooks de mensajes y estados (sent / delivered / read).
- Clasificación de intención: empezar por plantillas y etiquetas; no inventar NLP en producción sin diseño.
- Conversiones **solo** con vínculo explícito (ID de reservación o pedido).
- La UI ya advierte que las métricas dependen de permisos de la API.

## Míps (conector local)

No hay ejecutable local ni llamadas al POS activadas. Ya existe recepción HTTPS autenticada de eventos con contrato v1: pedido → registro transaccional → confirmación explícita enviada por el conector Míps. Un pedido pendiente nunca obtiene un folio inventado.

El contrato implementado, ejemplos, idempotencia y provisión están en [PRODUCCION.md](PRODUCCION.md). `POST /api/connector/events` exige token por restaurante/canal. La adaptación de TXT/CSV o API del POS queda pendiente del contrato autorizado de la instalación.

## Qué no hacer

- Scraping de portales.
- Fingir que una API existe.
- Mezclar conversaciones de WhatsApp con ventas.
- Poner secretos en el frontend.

## Pendientes hacia productivo

- OAuth y adaptadores específicos de cada proveedor (ya hay claves de ingreso por restaurante/canal).
- Operación de identidad a escala: recuperación de cuenta, MFA/SSO y limitación de intentos distribuida, si el despliegue lo requiere.
- Transporte duradero y reintentos desde el conector externo; el receptor ya aplica idempotencia y transacciones.
- Gestión de grupos de sucursales; hoy cada usuario pertenece a un restaurante aislado.
- Consentimiento y avisos de privacidad para Customer 360.
- Observabilidad (alertas reales, no solo timeline demo).
- El conector local firmado y actualizable.
