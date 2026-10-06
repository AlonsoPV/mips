# Míps Connect

Hub de operación e inteligencia para restaurantes. Incluye una demo explícita y un modo autenticado con recepción de eventos normalizados. Las conexiones con proveedores externos requieren sus adaptadores y contratos; no están activadas por defecto.

## 1. Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env`. En local puedes dejar `DATABASE_URL` vacío: la app usa [PGlite](https://pglite.dev/) en `./data`. En Replit usa el PostgreSQL del Repl (`DATABASE_URL`).

## 2. Variables necesarias

| Variable | Uso |
| --- | --- |
| `APP_MODE` | `demo` explícito para simulación; `live` para operación autenticada (valor seguro por defecto) |
| `PUBLIC_ORIGIN` | Origen HTTPS exacto de producción para validar escrituras del navegador |
| `CONNECTOR_KEYS` | Credenciales por restaurante y canal; ver docs/PRODUCCION.md |
| `TRUST_PROXY` | Solo `true` con proxy de confianza |
| `DATABASE_URL` | PostgreSQL de Replit. Vacío = PGlite local |
| `PORT` | Replit lo inyecta. Default `5000` |
| `ALLOW_RESEED` | `true` para permitir regenerar el seed en UI |
| `NODE_ENV` | `production` en Autoscale |

## 3. Inicialización de base de datos

El arranque crea tablas si no existen (`CREATE TABLE IF NOT EXISTS`). No hace falta un paso manual aparte, pero puedes forzar:

```bash
npm run db:push
```

`db:push` requiere `DATABASE_URL` de PostgreSQL real.

## 4. Seed

```bash
npm run db:seed
npm run db:seed -- --force
```

Corre automáticamente solo con `APP_MODE=demo`. Está prohibido en modo live y se rechaza si la base contiene otros restaurantes.

Dataset: 1 restaurante, 40 productos, ~1,200 pedidos Uber, ~700 reservaciones, ~1,500 conversaciones WhatsApp, ~1,000 clientes, ~1,100 ventas Míps, eventos del Hub. PRNG con semilla fija (no se regenera en cada carga).

## 5. Desarrollo

```bash
npm run dev
```

Escucha en `0.0.0.0:$PORT` (default 5000).

Con `APP_MODE=demo`, la vista pública contiene solo datos simulados. Con `APP_MODE=live`, se exige login, las sesiones duran ocho horas y los datos quedan acotados al restaurante del usuario. Crea usuarios con `npm run user:create` usando las variables descritas en [Producción](docs/PRODUCCION.md).

## 6. Build

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

`start` sirve el cliente compilado y la API en un solo proceso.

## 7. Deployment en Replit (Autoscale)

1. Importa este repositorio en Replit (GitHub: el remoto `origin`).
2. Añade PostgreSQL al Repl (Tools → Database). Confirma que existe `DATABASE_URL`.
3. En **Deployments → Secrets** copia: `DATABASE_URL`, `APP_MODE=live`, `NODE_ENV=production`, `PUBLIC_ORIGIN`, `CONNECTOR_KEYS`, `ALLOW_RESEED=false`.
4. Publish con **Autoscale** (no Static). El archivo `.replit` ya define `build = npm run build` y `run = npm run start`.
5. El servidor usa `process.env.PORT` y `0.0.0.0`. No uses `localhost` en producción.
6. El arranque aplica el esquema aditivo. En live no ejecuta seed; aprovisiona el primer usuario antes de abrir el servicio.

## 8. Cómo sustituir dummy data por APIs

Ver [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

Resumen: la UI solo habla con `/api`. Los mocks viven en `server/adapters`. Reemplaza `Mock*Adapter` por adapters reales que normalicen a `integration_events` y tablas de dominio. No hay scraping.

## Scripts

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm start`
- `npm run db:seed`

## Validación y activación

- `npm run test:audit`: demo aislada.
- `npm run test:production`: autenticación, aislamiento, conector, conciliación y exportaciones en memoria.
- [Contrato del conector y operación](docs/PRODUCCION.md).
