# SINHS Supplies & Equipment — Server (API)

Node.js + Express 5 + Knex + PostgreSQL REST API. Follows `../AGENTS.md`
(routes → services → repositories → PostgreSQL).

## First-time setup (Windows, local PostgreSQL)

1. **Create the database** (pgAdmin → Query Tool, or `psql -U postgres`):

   ```sql
   CREATE DATABASE sinhs_inventory;
   ```

2. **Configure the server:**

   ```bash
   cd server
   copy .env.example .env      # PowerShell: Copy-Item .env.example .env
   ```

   Edit `.env`: set `DB_PASSWORD` to your PostgreSQL password and `JWT_SECRET` to a long random
   string (e.g. run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).

3. **Install, create tables, seed:**

   ```bash
   npm install
   npm run db:setup            # migrations + roles, positions, demo accounts
   ```

   On Windows you can instead double-click **`db\migrateAndSeed.bat`** (or run
   `server\db\migrateAndSeed.bat`). It checks for `.env`, installs packages if needed, runs
   `knex migrate:latest`, then `knex seed:run`, and stops with a clear message if a step fails.

4. **Start the API:**

   ```bash
   npm run dev                 # http://localhost:4000/api/v1  (health: /api/v1/health)
   ```

Then start the client (`cd ../client && npm run dev`). Vite proxies `/api` to port 4000.

## Demo accounts

Seeded as active with the password in `SEED_DEFAULT_PASSWORD` (default `password123`):
`admin`, `custodian`, `staff`. New sign-ups start as **pending** until an admin approves them on the
Users page.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start with auto-restart (nodemon) |
| `npm start` | Start without auto-restart |
| `npm run migrate` / `migrate:rollback` | Apply / undo the latest migrations |
| `npm run seed` | Run seeds (safe to re-run) |
| `npm run db:setup` | Migrate + seed |
| `db\migrateAndSeed.bat` | Windows: migrate to latest + seed (double-click) |
| `npm run lint` / `format` | ESLint / Prettier |

## Endpoints (so far)

| Method & path | Access | Purpose |
|---------------|--------|---------|
| `GET /api/v1/health` | public | Health check |
| `GET /api/v1/positions` | public | Positions for dropdowns |
| `POST /api/v1/auth/register` | public | Self-registration (pending, no role) |
| `POST /api/v1/auth/login` | public | Sign in; sets httpOnly cookie |
| `POST /api/v1/auth/logout` | public | Clears the cookie |
| `GET /api/v1/auth/me` | signed in | Current user (restores the session on page load) |
| `PUT /api/v1/auth/change-password` | signed in | Change password (required after an admin reset) |
| `GET /api/v1/users?status=&search=` | admin | List users (default: active + deactivated) |
| `POST /api/v1/users/:id/approve` | admin | Approve pending account `{ roleCode, positionId }` |
| `POST /api/v1/users/:id/reject` | admin | Reject pending account `{ reason }` |
| `PUT /api/v1/users/:id/role` | admin | Change role `{ roleCode }` |
| `POST /api/v1/users/:id/reset-password` | admin | Returns `{ temporaryPassword }` |
| `PUT /api/v1/users/:id/status` | admin | `{ status: 'active' \| 'deactivated' }` |

Every write records an `audit_logs` row; registrations and approvals create in-app `notifications`.
