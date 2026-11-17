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
   npm run db:setup            # migrations + roles, positions, demo accounts, sample inventory
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

## Endpoints

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
| `GET /api/v1/dashboard/summary` | signed in | Role-based dashboard numbers and lists (each role gets only its own) |
| `GET /api/v1/notifications` | signed in | Recent notifications for the header bell |
| `GET /api/v1/notifications/unread-count` | signed in | Unread in-app notifications for the header bell |
| `POST /api/v1/notifications/:id/read`, `/read-all` | signed in | Mark one / all as read |
| `GET /api/v1/master-data/:resource` | signed in | `categories`, `units`, `locations`, `positions` (all, with `isActive`) |
| `POST/PUT/DELETE /api/v1/master-data/:resource[/:id]` | admin | Create, edit/activate, delete unused records |
| `GET /api/v1/item-types` | signed in | Item types with custom fields (`?activeOnly=true`) |
| `POST/PUT/DELETE /api/v1/item-types[/:id]` | admin, custodian | Manage types (kind/tracking locked once used) |
| `POST/PUT/DELETE /api/v1/item-types/:id/fields[/:fieldId]` | admin, custodian | Manage custom fields |
| `GET /api/v1/items` | signed in | Paginated list (`search`, `itemTypeId`, `categoryId`, `kind`, `lowStockOnly`, `availableOnly`, `sortBy`) |
| `GET /api/v1/items/:id` | signed in | Item with fields and units |
| `POST/PUT/DELETE /api/v1/items[/:id]` | admin, custodian | Manage items (opening stock goes to the ledger) |
| `POST/PUT /api/v1/items/:id/units[/:unitId]` | admin, custodian | Register / edit units |
| `POST /api/v1/items/:id/units/:unitId/status` | admin, custodian | Available, under repair, lost, disposed `{ status, remarks }` |
| `GET /api/v1/stock-transactions` | admin, custodian | Ledger (`itemId`, `type`, `dateFrom`, `dateTo`, `search`) |
| `POST /api/v1/stock-transactions/stock-in` | admin, custodian | `{ itemId, quantity, remarks }` |
| `POST /api/v1/stock-transactions/adjustments` | admin, custodian | `{ itemId, quantity (signed), remarks }` |
| `GET /api/v1/stock-transactions/reconciliation` | admin, custodian | Items whose stock does not match the ledger |
| `GET /api/v1/requests[/:id]` | signed in | Staff see their own; reviewers see all (`mine=true` for theirs) |
| `POST /api/v1/requests` | signed in | Submit `{ requestType, purpose, neededAt, dueDate?, items }` |
| `POST /api/v1/requests/:id/cancel` | requester | Cancel own pending request |
| `POST /api/v1/requests/:id/approve` | admin, custodian | `{ items: [{ requestItemId, approvedQuantity, remarks }], dueDate? }` |
| `POST /api/v1/requests/:id/reject` | admin, custodian | `{ reason }` |
| `POST /api/v1/requests/:id/release` | admin, custodian | `{ units: { [requestItemId]: [unitId] } }` for unit-tracked equipment |
| `GET /api/v1/borrow-records[/:id]` | signed in | Staff see their own (`status=borrowed\|overdue\|returned`) |
| `POST /api/v1/borrow-records/:id/return` | admin, custodian | `{ items: [{ borrowRecordItemId, condition, remarks }] }` |
| `GET /api/v1/reports/:report?format=json\|xlsx\|pdf` | admin, custodian | `stock-levels`, `transactions`, `borrowed-equipment`, `requests` |
| `GET /api/v1/audit-logs` | admin | Read-only log (`userId`, `entityType`, `action`, `dateFrom`, `dateTo`) |

Every write records an `audit_logs` row; registrations, requests and borrowing create in-app
`notifications`. A daily job (7:00 AM Manila, also run at startup) sends due-tomorrow and overdue
reminders once per borrow record.

## Database tables

| Migration | Tables |
|-----------|--------|
| `…0001_create_roles_positions_users` | `roles`, `positions`, `users` |
| `…0002_create_audit_logs_notifications` | `audit_logs`, `notifications` |
| `…0003_create_inventory_tables` | `categories`, `units`, `locations`, `item_types`, `item_type_fields`, `items`, `item_units`, `inventory_requests`, `inventory_request_items`, `borrow_records`, `borrow_record_items`, `stock_transactions` |

| `…0004_extend_master_data_and_notifications` | `is_active` / `created_by` / `updated_by` on master data, `borrow_record_items.remarks`, `notifications.dedupe_key` |

Seed `03_master_data.js` adds categories, units, locations, item types with custom fields and (only
when there are no items yet) sample items with opening stock written to the ledger. After pulling new
migrations, run `npm run migrate` (and `npm run seed` for the sample data).
