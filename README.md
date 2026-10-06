# Míps Connect

Hub de operación e inteligencia para restaurantes. Demo comercial que centraliza Uber Eats, OpenTable, WhatsApp Business y Míps POS con datos persistentes (dummy) y una API lista para sustituir mocks.

## 1. Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env`. En local puedes dejar `DATABASE_URL` vacío: la app usa [PGlite](https://pglite.dev/) en `./data`. En Replit usa el PostgreSQL del Repl (`DATABASE_URL`).

## 2. Variables necesarias

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL de Replit. Vacío = PGlite local |
| `PORT` | Replit lo inyecta. Default `5000` |
| `SESSION_SECRET` | Secreto de cookie (reservado para auth futura) |
| `DEMO_PASSWORD` | Se usa solo al seedear el usuario demo; la UI no pide login |
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

También corre solo si la base está vacía al iniciar el servidor.

Dataset: 1 restaurante, 40 productos, ~1,200 pedidos Uber, ~700 reservaciones, ~1,500 conversaciones WhatsApp, ~1,000 clientes, ~1,100 ventas Míps, eventos del Hub. PRNG con semilla fija (no se regenera en cada carga).

## 5. Desarrollo

```bash
npm run dev
```

Escucha en `0.0.0.0:$PORT` (default 5000).

La demo **no pide inicio de sesión**. Abre la URL y usa **Explorar mi operación**.

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
3. En **Deployments → Secrets** copia: `DATABASE_URL`, `SESSION_SECRET`, `DEMO_PASSWORD`, `ALLOW_RESEED=false`.
4. Publish con **Autoscale** (no Static). El archivo `.replit` ya define `build = npm run build` y `run = npm run start`.
5. El servidor usa `process.env.PORT` y `0.0.0.0`. No uses `localhost` en producción.
6. La primera petición puede tardar: crea tablas y ejecuta el seed si la DB está vacía.

## 8. Cómo sustituir dummy data por APIs

Ver [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

Resumen: la UI solo habla con `/api`. Los mocks viven en `server/adapters`. Reemplaza `Mock*Adapter` por adapters reales que normalicen a `integration_events` y tablas de dominio. No hay scraping.

## Scripts

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm start`
- `npm run db:seed`
