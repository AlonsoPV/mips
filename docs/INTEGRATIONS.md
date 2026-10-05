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

No hay `.exe` en esta demo. Hay un stub:

`POST /api/connector/events`

```json
{
  "event_id": "string",
  "channel": "uber_eats",
  "event_type": "order",
  "payload_version": "1",
  "payload": {},
  "created_at": "ISO-8601"
}
```

Respuesta:

```json
{ "status": "processed", "mips_folio": "M-123456", "error": null }
```

Arquitectura prevista:

```
Cloud Hub → HTTPS autenticado → conector local → Míps (TXT / CSV / HTTPS interno)
```

Campos mínimos del payload hacia el conector: `event_id`, `channel`, `event_type`, `payload_version`, `payload`, `created_at`.

El conector responde `received | processed | failed` + `mips_folio` + `error`.

Fuentes alternativas mientras no exista el .exe: exportación TXT/CSV de Míps subida a un endpoint de ingestión, o HTTPS si el sitio ya lo expone.

## Qué no hacer

- Scraping de portales.
- Fingir que una API existe.
- Mezclar conversaciones de WhatsApp con ventas.
- Poner secretos en el frontend.

## Pendientes hacia productivo

- OAuth / API keys por restaurante y canal.
- Autenticación real (más allá del usuario demo).
- Cola de webhooks e idempotencia (`external_id`).
- Multi-sucursal.
- Consentimiento y avisos de privacidad para Customer 360.
- Observabilidad (alertas reales, no solo timeline demo).
- El conector local firmado y actualizable.
