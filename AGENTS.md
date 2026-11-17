# AGENTS.md — SINHS Supplies & Equipment Management System

This file tells AI coding agents (and new developers) how this project is built and what rules to follow. Read it fully before planning, modifying, or creating code.

---

## 1. Project Overview

**SINHS Supplies & Equipment Management System** is a web-based inventory management application that helps the school manage, monitor, and track its supplies and equipment.

Core capabilities:

- **Inventory records** — items (supplies and equipment), categories, units, locations
- **Stock monitoring** — current quantity, reorder level, low-stock / out-of-stock alerts
- **Stock-in / Stock-out** — every quantity change is recorded as a transaction
- **Equipment borrowing & returns** — who borrowed what, when it is due, condition on return
- **Inventory requests & approvals** — every item (supply or equipment) must be requested; the Custodian approves or rejects before release
- **User management** — accounts, roles, and permissions
- **Item types with custom properties** — each item type (e.g. Laptop, Projector, Bond Paper) defines its own fields, and types/fields can be modified
- **Self-registration** — personnel sign up; Admin approves the account and assigns role and position
- **Reports** — stock levels, transaction history, borrowed/overdue equipment, requests; exportable to **Excel (.xlsx)** and **PDF**

Goals: reduce manual recordkeeping, improve accountability, prevent inventory discrepancies, and give personnel easy access to up-to-date inventory data.

---

## 2. Tech Stack

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Language     | JavaScript (no TypeScript)              |
| Frontend     | React + Vite                            |
| UI framework | Ant Design (`antd`)                     |
| HTTP client  | Native browser `fetch` (no Axios)       |
| Auth         | httpOnly cookie (JWT) + bcrypt hashing  |
| Timezone     | Asia/Manila                             |
| Backend      | Node.js + Express                       |
| API style    | REST (JSON)                             |
| Query builder| Knex.js (queries, migrations, seeds)    |
| Database     | PostgreSQL                              |

**Do NOT add:**

- **Zod** (or Joi, Yup, class-validator) — validation is written by hand (see §6).
- **Axios** or other HTTP libraries — use `fetch`.
- **ORMs** (Sequelize, Prisma, TypeORM, Objection) — use Knex only.
- Other CSS/UI frameworks (Tailwind, Bootstrap, MUI) — use Ant Design components and its theme tokens.
- **Global CSS or any CSS files** (`global.css`, `index.css`, CSS Modules, Sass/Less) — style with Ant Design theme tokens and inline `style={}` only (see §11).
- TypeScript, Create React App, or Next.js — the client is a plain JavaScript Vite app.
- Storing auth tokens in `localStorage` / `sessionStorage` or sending them in an `Authorization` header — auth uses cookies only.

Approved libraries beyond the core stack: `bcrypt`/`bcryptjs`, `jsonwebtoken`, `cookie-parser`, `cors`, `dotenv`, `exceljs` (Excel export), `pdfkit` (PDF export), `node-cron` (scheduled overdue checks), `dayjs`, `react-router-dom`, `nodemon` (dev). Ask before adding any other dependency.

---

## 3. Repository Structure

```
SINHS-Supplies-Equipment/
├── AGENTS.md
├── client/                      # React + Vite app (JavaScript)
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example             # VITE_API_URL
│   ├── src/
│   │   ├── api/                 # fetch wrappers, one file per resource
│   │   │   ├── httpClient.js    # base fetch helper (cookies, JSON, errors)
│   │   │   ├── items.api.js
│   │   │   └── ...
│   │   ├── components/          # shared/reusable UI components
│   │   ├── pages/               # route-level screens (one folder per module)
│   │   ├── hooks/               # custom hooks (useItems, useAuth, ...)
│   │   ├── context/             # React context (auth, app settings)
│   │   ├── routes/              # React Router config + protected routes
│   │   ├── theme/               # antdTheme.js (tokens), sharedStyles.js (shared inline styles)
│   │   ├── utils/               # formatters, constants
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── server/                      # Express API
    ├── src/
    │   ├── routes/              # Express routers: URL + middleware -> controller fn
    │   ├── services/            # business logic + validation
    │   ├── repositories/        # Knex queries ONLY
    │   ├── middlewares/         # auth, role check, error handler, request logger
    │   ├── utils/               # errors.js (createAppError), validators, constants
    │   ├── config/              # env loading, knex instance
    │   ├── app.js               # express app setup
    │   └── server.js            # starts the HTTP server
    ├── db/
    │   ├── migrations/
    │   └── seeds/
    ├── knexfile.js
    └── package.json
```

File naming: `<resource>.routes.js`, `<resource>.service.js`, `<resource>.repository.js`, `<resource>.api.js` (client). Use **camelCase + dot suffix** (`stockTransactions.service.js`); React components use **PascalCase** (`ItemTable.jsx`). See §12.

---

## 4. Architecture

Request flow (strict, one direction only):

```
React (pages/hooks) ──fetch──▶ REST API
                                  │
                          routes/ (Express Router)
                                  │  parse req, call service, send response
                          services/ (business logic)
                                  │  validate, apply rules, manage transactions
                          repositories/ (Knex)
                                  │  SQL only
                              PostgreSQL
```

### 4.1 Routes (`server/src/routes`)

- Define endpoints and attach middleware (auth, role check).
- Read `req.params`, `req.query`, `req.body`, `req.user` and pass plain values to a service.
- Send the response with the correct status code.
- **No business logic, no SQL, no Knex imports.**
- The server uses **Express 5**, which forwards errors thrown in async handlers to the error middleware automatically — no `asyncHandler` wrapper needed.

```js
// routes/items.routes.js
router.get('/', authenticate, async (req, res) => {
  const result = await itemService.listItems(req.query);
  res.json({ success: true, data: result.rows, meta: result.meta });
});
```

### 4.2 Services (`server/src/services`)

- **All business logic lives here**: validation, permission rules beyond role checks, stock calculations, status transitions, approval workflows.
- Call one or more repositories. Never write raw SQL or Knex query chains here.
- Own database transactions for multi-step operations: start a transaction with `knex.transaction()` and pass `trx` into repository functions.
- Throw `createAppError(message, statusCode, errors)` (see §7) for expected failures.
- Must not touch `req` / `res`.

### 4.3 Repositories (`server/src/repositories`)

- **Only data access** using Knex. No business rules, no HTTP concerns.
- Every function accepts an optional `trx` (default to the shared `knex` instance):

```js
// repositories/items.repository.js
const findById = (id, trx = knex) =>
  trx('items').where({ id }).whereNull('deleted_at').first();
```

- Return plain objects/arrays. Select explicit columns where practical (never return password hashes).
- Use parameter binding (Knex does this) — never build SQL by string concatenation. If `knex.raw` is needed, use `?` bindings.

### 4.4 Frontend API layer (`client/src/api`)

> **Current phase:** every module uses the real API: auth, Users, dashboards, notifications (bell list + daily borrow reminders), Master data, Item types & fields, Items (with unit tracking), Stock transactions, Requests (approve/reject/release), Borrowing & returns, Reports (Excel/PDF) and the Audit log, plus the staff pages (Available items, My requests, My borrowed items). Seeds add roles, positions, demo accounts and sample categories, units and locations; item types and items are created in the app; there is no static or sample data in the client.

- All network calls go through `httpClient.js`, built on native `fetch`.
- Components and pages never call `fetch` directly; they call `api/*.api.js` functions. **Pages load data themselves** — in a `useEffect` with an `ignore` flag for cleanup, using an `async` loader function with `try/catch/finally` (never `.then()`; see §12.6) — and call API functions in event handlers for actions. Don't create custom data hooks (`useUsers`, `useApiQuery`, …); `useAuth` is the only shared hook.
- `httpClient` responsibilities: base URL from `import.meta.env.VITE_API_URL`, JSON headers, **`credentials: 'include'` on every request** so the auth cookie is sent, parsing the standard response envelope, throwing on `success: false` or non-2xx, and redirecting to login on 401.

```js
// api/httpClient.js
export async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(path, import.meta.env.VITE_API_URL);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send the httpOnly auth cookie
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) onUnauthorized(); // e.g. clear auth context, go to /login
  const json = await readJson(res); // returns {} for a non-JSON body (try/catch inside, no .catch())
  if (!res.ok || json.success === false) throw new Error(json.message || res.statusText);
  return json;
}
```

---

## 5. REST API Conventions

- Base path: `/api/v1`
- Plural, kebab-case resource names: `/api/v1/items`, `/api/v1/stock-transactions`, `/api/v1/borrow-records`
- Standard verbs:

| Action            | Method & path                       | Success code |
|-------------------|-------------------------------------|--------------|
| List              | `GET /items`                        | 200 |
| Get one           | `GET /items/:id`                    | 200 |
| Create            | `POST /items`                       | 201 |
| Update            | `PUT /items/:id` (or `PATCH`)       | 200 |
| Delete (soft)     | `DELETE /items/:id`                 | 200 / 204 |
| Workflow action   | `POST /requests/:id/approve`        | 200 |

- List query params: `page`, `pageSize` (default 20, max 100), `search`, `sortBy`, `sortOrder` (`asc|desc`), plus resource filters (`categoryId`, `status`, `dateFrom`, `dateTo`).
- Whitelist `sortBy` columns in the service — never pass user input straight into `orderBy`.

**Response envelope (always):**

```json
// success
{ "success": true, "data": { }, "meta": { "page": 1, "pageSize": 20, "total": 134 } }

// error
{ "success": false, "message": "Insufficient stock for item 'Bond Paper A4'", "errors": { "quantity": "Exceeds available stock (12)" } }
```

**Status codes:** 400 validation, 401 not authenticated, 403 not allowed, 404 not found, 409 conflict (duplicate code, insufficient stock, invalid status transition), 500 unexpected.

JSON keys in API payloads use **camelCase**; database columns use **snake_case**. Convert in the repository layer (or with a shared mapper) — be consistent.

---

### Report exports

- Reports are generated **on the server** from the same service that serves the on-screen data: `GET /api/v1/reports/<report>?format=json|xlsx|pdf&...filters`.
- Excel with `exceljs`, PDF with `pdfkit`. Set `Content-Type` and `Content-Disposition: attachment; filename="<report>-<YYYY-MM-DD>.<ext>"` (date in Asia/Manila).
- Exports include the school name, report title, filters used, generated-by user, and generated-at timestamp (Asia/Manila).
- Client downloads with `fetch(..., { credentials: 'include' })` → `res.blob()` → temporary object URL. Add a `download` helper in `httpClient.js`.

---

## 6. Validation (no Zod)

- Validate in the **service layer** with plain JavaScript, before calling repositories.
- Put reusable checks in `server/src/utils/validators.js` (e.g. `isRequired`, `isPositiveInt`, `isEmail`, `isOneOf`, `isValidDate`).
- Collect field errors into an object and throw once:

```js
const errors = {};

if (!payload.name?.trim()) {
  errors.name = 'Name is required';
}

if (!Number.isInteger(payload.quantity) || payload.quantity <= 0) {
  errors.quantity = 'Quantity must be a positive whole number';
}

throwIfInvalid(errors); // throws createAppError('Validation failed', 400, errors) when not empty
```

- Frontend validation is written by hand in a `validateForm` function for UX only (see §12.7 Forms); the server is always the source of truth.
- Database constraints (`NOT NULL`, `UNIQUE`, `CHECK`, foreign keys) are the last line of defense — add them in migrations.

---

## 7. Error Handling

- **No classes for errors.** `server/src/utils/errors.js` exports plain functions:
  - `createAppError(message, statusCode = 400, errors)` — returns a built-in `Error` (keeps the stack trace) with `isAppError: true`, `statusCode` and optional field `errors`.
  - `isAppError(error)` — used by the error handler instead of `instanceof`.
  - `throwIfInvalid(errors)` — throws a 400 validation error when the errors object has entries.
- Client: `createApiError(message, status, errors)` in `client/src/api/httpClient.js` (same idea; read `error.status` / `error.errors`).

```js
// service
if (!user) {
  throw createAppError('User not found', 404);
}

// errorHandler.js
if (isAppError(err)) {
  res.status(err.statusCode).json({ success: false, message: err.message, errors: err.errors });
  return;
}
```
- One global error middleware in `middlewares/errorHandler.js` formats every error into the envelope above.
- Unknown errors → 500 with a generic message; log the full error server-side. Never leak stack traces or SQL in responses.
- Map known PostgreSQL errors (e.g. `23505` unique violation → 409, `23503` FK violation → 409/400).
- Frontend: show errors with Ant Design `message` / `notification`; show field errors by putting them into the form's `errors` state (shown via `Form.Item` `help`, see §12.7).

---

## 8. Database (PostgreSQL + Knex)

- All schema changes go through **Knex migrations** (`npx knex migrate:make <name>`). Never edit a migration that has already been run on a shared database — create a new one.
- Seeds provide the three roles, common positions, an initial admin account (password read from env, hashed with bcrypt), categories, units, and sample data for development.
- Table names: plural, snake_case (`items`, `stock_transactions`). Columns: snake_case.
- Every table: `id` (serial/bigserial or uuid — pick one and stay consistent), `created_at`, `updated_at`; master data tables also get `deleted_at` for soft delete and `created_by` / `updated_by` for accountability.
- Use `numeric` for money/cost, `integer` for quantities, `timestamptz` for timestamps.
- **Timezone:** the app timezone is **Asia/Manila**. Store timestamps as `timestamptz`; set the session timezone in the Knex pool (`afterCreate: (conn, done) => conn.query("SET timezone = 'Asia/Manila'", done)`) and `TZ=Asia/Manila` for the Node process. Date-range filters and "overdue" checks use Manila dates.
- Add indexes for foreign keys and frequently filtered columns (`item_id`, `status`, `created_at`).

### Suggested core tables

| Table | Purpose |
|-------|---------|
| `roles` | `admin`, `custodian`, `staff` (seeded; see §10) |
| `positions` | Actual school positions (Principal, Property Custodian, Teacher I, ...) — a label only, never used for permissions |
| `users` | Accounts (`username`, `email`, `password_hash`, `full_name`, `role_id` (nullable until approved), `position_id`, `status` (`pending` \| `active` \| `rejected` \| `deactivated`), `approved_by`, `approved_at`, `must_change_password`, `last_login_at`). Requests and reports are tracked **per user** (no departments). |
| `categories` | Item grouping |
| `units` | pcs, ream, box, set, ... |
| `locations` | Storage rooms / offices |
| `item_types` | Configurable types (Laptop, Projector, Bond Paper, ...): `name`, `kind` (`supply` \| `equipment`), `tracking_mode` (`quantity` \| `unit`), `max_borrow_days` (equipment only, nullable = no limit), `is_active` |
| `item_type_fields` | Custom property definitions per type: `item_type_id`, `key`, `label`, `data_type` (`text` \| `number` \| `date` \| `boolean` \| `select`), `options` (jsonb, for `select`), `is_required`, `applies_to` (`item` \| `unit`), `sort_order` |
| `items` | `code` (unique), `name`, `item_type_id`, `category_id`, `unit_id`, `quantity_on_hand`, `reorder_level`, `location_id`, `attributes` (jsonb — values for the type's `item` fields) |
| `item_units` | Individual pieces for `tracking_mode = 'unit'` types: `item_id`, `property_no` (unique), `serial_no`, `condition`, `status` (`available` \| `borrowed` \| `under_repair` \| `lost` \| `disposed`), `attributes` (jsonb — values for the type's `unit` fields) |
| `stock_transactions` | Ledger: `item_id`, `type` (`stock_in` \| `stock_out` \| `adjustment` \| `borrow` \| `return`), `quantity`, `reference_type`, `reference_id`, `remarks`, `performed_by` |
| `inventory_requests` / `inventory_request_items` | **Every** release of an item starts here. `request_type` (`supply` \| `borrow`), `requested_by`, `purpose`, `needed_at`, `due_at` (borrow only), `status` (`pending` \| `approved` \| `rejected` \| `released` \| `returned` \| `cancelled`), `reviewed_by`, `reviewed_at`, `rejection_reason`. Request items hold `item_id`, `requested_quantity`, `approved_quantity`, `released_quantity`, `remarks` |
| `borrow_records` / `borrow_record_items` | Created when an approved `borrow` request is released: `request_id`, borrower, specific `item_unit_id`s (for unit-tracked types), `borrowed_at`, `due_at`, `returned_at`, `status`, return condition |
| `audit_logs` | `user_id`, `action` (`create` \| `update` \| `delete` \| `approve` \| `reject` \| `login` ...), `entity_type`, `entity_id`, `before` (jsonb), `after` (jsonb), `ip_address`, `created_at`. Insert-only. |
| `notifications` | In-app only: `user_id`, `type`, `title`, `message`, `link`, `is_read`, `created_at` |

---

## 9. Business Rules (enforce in services)

- **Stock never goes negative.** Stock-out, release, and borrow must check available quantity inside the same transaction, using `SELECT ... FOR UPDATE` (`.forUpdate()`) on the item row.
- **Every quantity change writes a `stock_transactions` row** in the same DB transaction as the `items.quantity_on_hand` update. Never update quantity without a ledger entry.
- `quantity_on_hand` must always equal the sum of the ledger; provide a reconcile report/check.
- **Requests workflow:** `pending → approved → released`, or `pending → rejected`, or `pending → cancelled` (by requester). Any other transition → 409. **Custodian** approves or rejects requests and releases approved items (Admin can also do this as a fallback); nobody can approve their own request. Release deducts stock. A rejection requires a reason.
- **No release without an approved request.** Supplies (consumed) and equipment (borrowed) both require a request that a **Custodian approves** before anything leaves inventory. There is no direct/walk-in stock-out or issue path that skips the request. Custodian-only stock-in and adjustments (corrections, disposal) are not requests but still write ledger entries with a reason.
- **Partial approval:** the Custodian sets `approved_quantity` per request item (0 ≤ approved ≤ requested, and ≤ available stock); a remark is required when it is less than requested. Approving every item at 0 is a rejection. Release uses `approved_quantity`.
- **Max borrow days:** when an item type has `max_borrow_days`, a borrow request's `due_at` cannot be more than that many days after `needed_at` (Manila dates); the Custodian may shorten but not exceed it. With multiple items, the strictest limit applies.
- **Borrowing applies to equipment only** and follows the same request flow: `pending → approved → released (borrowed) → returned`. Borrow reduces available quantity; return restores it and records condition (`good`, `damaged`, `lost`). Damaged/lost returns do not restore usable stock automatically. Overdue = `due_at < now()` and not returned.
- **Low stock** = `quantity_on_hand <= reorder_level`; show on dashboard and in reports.
- **In-app notifications (no email):** created by services in the same transaction as the triggering change — request submitted (to custodians), approved / partially approved / rejected / released (to requester), borrowed item due tomorrow and overdue (to borrower and custodians), new self-registration (to admins), account approved/rejected (to the user). Client shows a bell with unread count (poll `GET /api/v1/notifications/unread-count`, e.g. every 60s) and marks items read. Overdue/due-soon notifications come from a daily scheduled check (e.g. `node-cron`) that must not create duplicates.
- **Audit log:** every create/update/delete and workflow action (approve, reject, release, return, account approval, role change, login) writes an `audit_logs` row from the service layer with before/after values (never passwords or hashes). Audit logs are insert-only — no update/delete endpoints. Admin has a read-only Audit Log page with filters (user, entity, action, date range).
- **Item types & custom properties:** Admin/Custodian can create and modify item types and their fields. When an item or unit is saved, the service validates `attributes` against the type's field definitions (required fields present, values match `data_type`, `select` values are in `options`); unknown keys are rejected. Changing a field must not break existing records — prefer deactivating/renaming over deleting a field that has data, and never change a field's `data_type` once values exist without a migration plan. A type in use cannot be deleted, only deactivated.
- **Tracking mode:** `quantity` types use `items.quantity_on_hand` only. `unit` types (most equipment) track each piece in `item_units`; borrowing/issuing picks specific units, and `quantity_on_hand` equals the count of units with `status = 'available'` (kept in sync in the same transaction).
- **Soft delete** master data (items, categories, users). Items with transaction history cannot be hard-deleted.
- Record `performed_by` / `created_by` from `req.user`, never from the request body.

---

## 10. Authentication & Authorization

### Cookie-based auth (no tokens in JS)

- Passwords are hashed with **bcrypt** (`bcrypt` or `bcryptjs`, cost factor 10–12). Never store, log, or return plain passwords or hashes.
- `POST /api/v1/auth/login` verifies the password, then sets a signed JWT in an **httpOnly cookie** (e.g. `sinhs_token`):
  - `httpOnly: true`, `sameSite: 'lax'` (or `'strict'`), `secure: true` in production, `path: '/'`, `maxAge` matching `JWT_EXPIRES_IN`.
  - The token is **never** returned in the response body and never stored in `localStorage`/`sessionStorage`.
- `POST /api/v1/auth/logout` clears the cookie. `GET /api/v1/auth/me` returns the current user (id, name, role, position) so the client can restore the session on page load.
- Server uses `cookie-parser`; `middlewares/auth.js` reads the cookie, verifies the JWT, loads the user, rejects inactive users, and sets `req.user`.
- CORS: `origin: CORS_ORIGIN` (the Vite dev URL in development) with `credentials: true`. In development, the Vite proxy (`server.proxy` in `vite.config.js`) may be used instead so client and API share an origin.
- Use generic login errors ("Invalid username or password"). Consider rate-limiting the login route.
- Only users with `status = 'active'` can log in; `pending`, `rejected`, and `deactivated` users get a clear message, and a deactivated user's existing cookie stops working.

### Self-registration

- `POST /api/v1/auth/register` (public): username, email, full name, position, password (+ confirm). Creates the user with `status = 'pending'` and **no role**. Validate unique username/email and a minimum password length (8+).
- Admin sees pending accounts, then **approves** (assigns role — default `staff` — and confirms position) or **rejects** (with reason). `approved_by` / `approved_at` are recorded.
- Registration never lets the user choose their own role.

### Password reset (no email)

- Forgotten passwords are reset by **Admin**: `POST /api/v1/users/:id/reset-password` sets a temporary password (bcrypt-hashed) and `must_change_password = true`.
- A user with `must_change_password = true` can only call `auth/me`, `auth/logout`, and `PUT /api/v1/auth/change-password` until they set a new password. The client redirects them to a Change Password screen.
- Any user can change their own password (current password required). Resets and changes are audit-logged (without the password values).

### Roles

Roles control **permissions**. A user's school **position** (Principal, Teacher III, Property Custodian, ...) is stored separately and is display-only.

| Role (`roles.code`) | Typical positions | Permissions |
|------|------|------|
| `admin` | Principal / school head, ICT coordinator | **Approve/reject self-registered accounts**, user & role management, master data (categories, units, locations, positions, item types & fields), all reports; can do anything a custodian can as a fallback |
| `custodian` (stock manager) | Property custodian, supply officer | **Approve/reject requests**, release approved items, manage items, item types & fields, and stock (stock-in/out, adjustments), issue/receive borrowed equipment, reports |
| `staff` | Teachers, department heads, other personnel | Self-register (pending Admin approval), view available items, create/cancel own supply and borrow requests, view own history |

- `middlewares/authorize.js` checks roles: `authorize('admin', 'custodian')`.
- Frontend: protected routes redirect to `/login`; hide menu items the user's role can't access (the server still enforces every rule).

---

## 11. Frontend Guidelines (React + Ant Design)

- Function components and hooks only.
- Use Ant Design components first: `Layout`, `Menu`, `Table` (server-side pagination/sorting), `Form`, `Modal`, `Drawer`, `Tag` (statuses), `Statistic`/`Card` (dashboard), `DatePicker`, `Select`, `message`/`notification`.
- **Styling = Ant Design theme tokens + inline `style={}` only.** No CSS files (no `global.css`, CSS Modules, Sass) and no `className`-based styling.
  - Ant Design components are themed through `ConfigProvider` tokens in `src/theme/antdTheme.js`; use component props (`styles`, `variant`, `size`) before adding inline styles to antd components.
  - Inline styles are defined as a `STYLES` object at the top of the component file (`style={STYLES.card}`) instead of large object literals inside JSX; small one-offs (`style={{ marginTop: 16 }}`) are fine.
  - Styles reused across files live in `src/theme/sharedStyles.js` (e.g. `headingStyle()`, `HEADING_FONT`); colors come from `BRAND_COLORS` in `utils/constants.js`.
  - Responsive values use `Grid.useBreakpoint()` (no media queries). Base page styles (`margin: 0`, background) are on `<body>` in `index.html`.
- Data fetching pattern: a hook per resource (`useItems(filters)`) that returns `{ data, meta, loading, error, refetch }`, built on the `api/` functions.
- Keep pages thin: page = layout + hooks + components.
- Consistent status colors (e.g. pending = gold, approved = blue, released/returned = green, rejected/overdue = red).
- Use `dayjs` (bundled with antd) with the `utc` + `timezone` plugins; display all dates in **Asia/Manila**.

---

## 12. Coding Standards

### 12.1 Language & modules

- JavaScript with **ES modules everywhere** (`import`/`export`). Server `package.json` has `"type": "module"`; `knexfile.js`, migrations, and seeds use ES module exports. Include file extensions in relative imports (`./items.service.js`).
- `async/await` only — no callback chains and **no promise chains**: never use `.then()`, `.catch()` or `.finally()`, in the client or the server (this includes `useEffect` loaders and `response.json()`). Handle errors with `try { await … } catch { … } finally { … }`.
- **No `Promise.all`** (or `Promise.allSettled` / `Promise.race`): await each call on its own line, one after another, so the flow reads top to bottom:

```js
// ✗ Don't
const [result, reconciliation] = await Promise.all([listStockTransactions(query), getReconciliation()]);

// ✓ Do
const result = await listStockTransactions(query);
const reconciliation = await getReconciliation();
```
- `const` by default, `let` only when reassigned, never `var`. Strict equality (`===`, `!==`).

### 12.2 Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Files (server & client non-components) | camelCase + dot suffix | `stockTransactions.service.js`, `items.repository.js`, `inventoryRequests.api.js` |
| React component files | PascalCase `.jsx` | `ItemTable.jsx`, `RequestFormModal.jsx` |
| Hooks | `use` + PascalCase, camelCase file | `useItems` in `useItems.js` |
| Variables & functions | camelCase, verb-first for functions | `approveRequest`, `findItemById` |
| React components | PascalCase | `ItemTable` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE`, `REQUEST_STATUS` |
| Booleans | `is` / `has` / `can` prefix | `isActive`, `canApprove` |
| DB tables & columns | snake_case (plural tables) | `stock_transactions.item_id` |
| API JSON keys | camelCase | `approvedQuantity` |
| URL paths | kebab-case, plural | `/api/v1/stock-transactions` |

- Descriptive names (`releaseApprovedRequest`, not `doRelease`). No unclear abbreviations (`qty` is acceptable; `rq`, `itm` are not).
- Status/enum values are defined once as frozen constant objects (e.g. `utils/constants.js`) and reused — no magic strings scattered in code.

### 12.3 Functions & exports

- **Arrow functions** for everything: components, hooks, services, repositories, helpers, route handlers.

```js
export const ItemTable = ({ items, loading, onEdit }) => { ... };
export const approveRequest = async (requestId, payload, user) => { ... };
```

- **No classes or OOP** anywhere (`class`, `extends`, `this`, `new MyThing()`): use plain functions and plain objects. Need an object with shared behavior? Write a factory function that returns an object. Errors are created with `createAppError` / `createApiError` (§7). Enforced by ESLint (`no-restricted-syntax` on `ClassDeclaration` / `ClassExpression`). Built-ins like `new Error()`, `new Date()`, `new URLSearchParams()` are fine.

```js
// ✗ Don't
export class AppError extends Error { constructor(message, statusCode) { super(message); this.statusCode = statusCode; } }

// ✓ Do
export const createAppError = (message, statusCode = 400, errors) => {
  const error = new Error(message);

  error.isAppError = true;
  error.statusCode = statusCode;
  error.errors = errors;

  return error;
};
```

- **Named exports only** — no `export default` (exception: config files that a tool requires to be default-exported, such as `vite.config.js`, `knexfile.js`, and Knex migrations/seeds' expected exports).
- Import by name: `import { approveRequest } from '../services/inventoryRequests.service.js';`
- Keep functions small and single-purpose; prefer early returns over deep nesting.
- Max ~3 positional parameters; beyond that pass an object.

### 12.4 Documentation (JSDoc everywhere)

Every function, component, hook, and exported constant gets a **JSDoc** block — including non-exported helpers.

- Describe what it does (one sentence), every parameter (`@param`), return value (`@returns`), and errors thrown (`@throws`) where applicable.
- Use JSDoc types for clarity (`{number}`, `{Object}`, `{Promise<Item>}`); define shared shapes with `@typedef` (e.g. in `utils/types.js`).
- React components document their props.
- Inline comments explain **why**, not what. Remove commented-out code.

```js
/**
 * Approves a pending request, allowing partial quantities per item.
 * @param {number} requestId - ID of the request to approve.
 * @param {{ items: Array<{ requestItemId: number, approvedQuantity: number, remarks?: string }> }} payload - Approved quantities.
 * @param {AuthUser} user - The custodian performing the approval (from req.user).
 * @returns {Promise<InventoryRequest>} The updated request.
 * @throws {AppError} 409 if the request is not pending or stock is insufficient.
 */
export const approveRequest = async (requestId, payload, user) => { ... };

/**
 * Table of inventory items with server-side pagination.
 * @param {Object} props
 * @param {Item[]} props.items - Rows to display.
 * @param {boolean} props.loading - Shows the table loading state.
 * @param {(item: Item) => void} props.onEdit - Called when Edit is clicked.
 * @returns {JSX.Element}
 */
export const ItemTable = ({ items, loading, onEdit }) => { ... };
```

### 12.5 Formatting & linting

- **ESLint + Prettier** in both `client/` and `server/`; code must pass lint before commit.
- Prettier: 2-space indent, single quotes, semicolons, trailing commas, 100-char line width.
- Import order: external packages → internal modules → styles, separated by a blank line.
- **Line endings: LF everywhere**, enforced by `.gitattributes` (`* text=auto eol=lf`) so Windows checkouts match Prettier. Don't commit CRLF files; set your editor to LF (VS Code: `"files.eol": "\n"`). If git shows files as changed with an empty diff, it's line endings — run `git add --renormalize .` or `git update-index --really-refresh`.

#### Braces and spacing (readability)

- **Always use braces** for `if` / `else if` / `else`, even for one line. No single-line `if (x) doThing();`.
- **One logical block per paragraph:** separate each logical step with **one blank line** — each validation check, each `if` block, each `try`, multi-line statements, and before `return`.
- Group related one-line `const` declarations together, then a blank line before the next step.
- Validation follows this exact shape — one field per block, `else if` chains for the same field:

```js
const errors = {};

if (!isRequired(fullName)) {
  errors.fullName = 'Enter your full name';
}

if (!isRequired(username)) {
  errors.username = 'Choose a username';
} else if (!isUsername(username)) {
  errors.username = 'Use 3–50 letters, numbers, dots, underscores or hyphens';
} else if (await usersRepository.usernameExists(username.trim())) {
  errors.username = 'Username is already taken';
}

throwIfInvalid(errors);
```

- Enforced by ESLint in both projects (`curly: 'all'` and `padding-line-between-statements`); `npx eslint . --fix` applies it automatically.

### 12.6 React specifics

- Function components with hooks only; one component per file.
- Pages own their data loading (`useEffect` + `api/*.api.js`); network details stay in `src/api`.
- **Loading data in `useEffect`:** an effect callback can't be `async`, so declare a named `async` loader inside the effect (with JSDoc), call it, and use an `ignore` flag so a slow response never updates an unmounted component. No `.then()` chains (§12.1).

```jsx
useEffect(() => {
  let ignore = false;

  /**
   * Loads the dashboard numbers and lists for this role. Skips state updates after unmount.
   * @returns {Promise<void>}
   */
  const loadSummary = async () => {
    try {
      const data = await getDashboardSummary();

      if (!ignore) {
        setSummary(data);
        setErrorMessage('');
      }
    } catch (error) {
      if (!ignore) {
        setErrorMessage(error.message);
      }
    } finally {
      if (!ignore) {
        setLoading(false);
      }
    }
  };

  loadSummary();

  return () => {
    ignore = true;
  };
}, [reloadKey]);
```
- Always provide `key` props from stable IDs (never array index for dynamic lists).
- Clean up effects (abort `fetch` with `AbortController` on unmount).

### 12.7 Forms (controlled state + onChange)

Forms are **controlled components**: values live in React state and update through `onChange`. Do **not** use `Form.useForm()` or `Form.Item name`/`rules` to store values or validate.

- **One state object per form**, with the initial values written **inline** in `useState` (no separate `INITIAL_…` constant):

```jsx
const [formData, setFormData] = useState({
  fullName: '',
  username: '',
  email: '',
  positionId: null,
  password: '',
  confirmPassword: '',
});
const [errors, setErrors] = useState({});
```

- **onChange handlers:** one `updateField(field, value)` that updates `formData` and clears that field's error; text/password inputs share `handleInputChange` (reads `event.target.name`), while components that pass a value instead of an event (Ant Design `Select`, `DatePicker`, `Checkbox`) get their own small handler.

```jsx
const updateField = (field, value) => {
  setFormData((current) => ({ ...current, [field]: value }));
  setErrors((current) => ({ ...current, [field]: undefined }));
};
const handleInputChange = (event) => updateField(event.target.name, event.target.value);
const handlePositionChange = (positionId) => updateField('positionId', positionId);

<Input id="username" name="username" value={formData.username} onChange={handleInputChange} />
```

- **Validation:** a plain `validateForm(data)` function (outside the component) returns `{ field: message }`; `handleSubmit` runs it, stores the result in `errors`, and stops if anything failed. Show messages with `Form.Item`'s `validateStatus="error"` and `help={errors.field}`.
- **Layout:** Ant Design `<Form layout="vertical" onFinish={handleSubmit}>` and `Form.Item` are used for labels, spacing and submit only — not for storing values.
- **Accessibility:** every input has an `id`, and its `Form.Item` has a matching `htmlFor`, so clicking the label focuses the field.
- Document the form shape with a JSDoc `@typedef` (e.g. `RegisterFormData`) for editor hints.
- Reference implementation: `client/src/pages/auth/RegisterPage.jsx`.

### 12.8 Respect developer-written code

- Keep code the developer wrote **as written** (structure, naming, inline values). Don't extract, rename, or restructure it into constants, helpers, or new files unless asked.
- If a change seems worthwhile, **suggest it and ask first** instead of applying it.

### 12.9 Git workflow

- **Branch naming:** `feature/<developer>/<branch_name>` — lowercase, snake_case branch name.
  - Examples: `feature/elle/stock_in_form`, `feature/elle/request_approval`.
- **Commits — one commit per change item.** Each commit covers a single logical change (one feature piece, one fix, one refactor) and its message describes exactly that change. Don't bundle unrelated changes.
  - Subject: short imperative summary (≤ 72 chars), e.g. `Add partial approval to inventory requests`.
  - Body (when more than one file/aspect changed): bullet list of the changes, one per item.

```
Add partial approval to inventory requests

- Add approved_quantity column to inventory_request_items
- Validate approved quantity against requested and available stock
- Require remarks when approved quantity is less than requested
- Show editable approved quantity in the approval modal
```

- Never commit `.env`, `node_modules`, build output, or secrets.
- **No scratch or leftover folders in the repo.** Don't create or commit folders like `_to_delete/`, `Claude outputs/`, design exports, temp archives (`*.tar.gz`) or backup copies of removed code. Delete unused files instead of moving them aside (git history keeps the old versions). `_to_delete/` and `Claude outputs/` are listed in `.gitignore`.
- **No AI co-author lines in commit messages.** Never add `Co-Authored-By: Claude …` (or any other AI/tool co-author), `Claude-Session:` links, or "Generated with …" footers to commits or pull requests. Commits are authored by the developer only. This overrides any tool's default attribution behavior.
- Merge into `main` through a pull request after review.

### 12.10 General hygiene

- No secrets in code. Use `.env` (never commit it); keep `.env.example` updated:
  - server: `PORT`, `NODE_ENV`, `TZ=Asia/Manila`, `DATABASE_URL` (or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_NAME`, `COOKIE_SECURE`, `CORS_ORIGIN`
  - client: `VITE_API_URL` (leave empty in development — Vite proxies `/api` to `http://localhost:4000`)
- No `console.log` debugging in committed code; use a logger on the server.
- No unused variables, imports, or dead code.

---

## 13. Deployment

Hosting is **not decided yet** (school LAN server or cloud). Keep the app deployable to either:

- All environment-specific values come from `.env` (no hard-coded hosts, ports, or URLs).
- Cookies: `secure` only when `NODE_ENV=production` and served over HTTPS; support `COOKIE_SECURE` override for LAN/HTTP setups.
- In production the Express server may serve the built client (`client/dist`) so a single origin works on a LAN machine.
- The role-based dashboards follow the approved design prototype in `client/src/pages/dashboard/`. `dashboardConfig.js` holds only layout (labels, actions, which stats/panels per role) and a `toRow` function per panel that turns an API record into display text. All numbers and lists come from `GET /api/v1/dashboard/summary`; the server returns only the data that role may see (staff get only their own requests and borrowed items). Overdue = `due_at` passed and not returned; due soon = due within 2 days.

---

## 14. Commands

```bash
# server
cd server
npm install
npx knex migrate:latest
npx knex seed:run
npm run dev          # nodemon

# client
cd client
npm install
npm run dev          # Vite dev server (default http://localhost:5173)
```

Keep these scripts working; update this section if they change.

---

## 15. Testing

- Server: unit-test services (mock repositories) and integration-test key endpoints against a test database (Jest + Supertest).
- Priority test cases: insufficient stock, negative quantity, invalid request status transitions, self-approval blocked, borrow/return quantity math, role-based access, login/logout cookie behavior, inactive user blocked.
- Client: test critical forms and hooks (React Testing Library) where practical.

---

## 16. Agent Checklist

Before finishing any task, confirm:

- [ ] Logic is in the correct layer (routes → services → repositories). No SQL outside repositories, no business logic in routes.
- [ ] No Zod, Axios, ORM, or new UI framework was introduced.
- [ ] Frontend calls go through `client/src/api` using `fetch`.
- [ ] Inputs are validated in the service; errors use `createAppError` / `throwIfInvalid` and the standard envelope.
- [ ] Multi-step writes use a Knex transaction; stock changes write a ledger entry.
- [ ] Schema changes are new migrations, not edits to old ones.
- [ ] Protected endpoints use `auth` and `authorize` middleware; auth relies only on the httpOnly cookie.
- [ ] Client `fetch` calls use `credentials: 'include'`; no tokens in browser storage.
- [ ] Only the three roles (`admin`, `custodian`, `staff`) are used for permissions — never `position`.
- [ ] Dates are handled and displayed in Asia/Manila.
- [ ] Item `attributes` are validated against the item type's field definitions.
- [ ] Changes write an audit log entry; relevant users get an in-app notification.
- [ ] ES modules, arrow functions, named exports, camelCase file names (PascalCase components).
- [ ] No classes/OOP — plain functions and objects; errors via `createAppError` / `createApiError`.
- [ ] No `.then()` / `.catch()` / `.finally()` chains and no `Promise.all` — `async/await`, one call per line, with `try/catch/finally` (`useEffect` loaders included).
- [ ] No CSS files or `className` styling — theme tokens and inline `style={}` only.
- [ ] Every function/component has a JSDoc block.
- [ ] Every `if`/`else` has braces, and logical blocks are separated by one blank line (`npm run lint` passes).
- [ ] Forms use `useState` (initial values inline) + `onChange` + `validateForm` — no `Form.useForm()`; inputs have `id`/`htmlFor`.
- [ ] Developer-written code was kept as written (changes suggested, not applied, unless asked).
- [ ] Branch is `feature/<developer>/<branch_name>`; one commit per change item.
- [ ] Commit messages have no `Co-Authored-By: Claude` / AI attribution lines.
- [ ] No scratch/leftover folders or files (`_to_delete/`, `Claude outputs/`, archives, backups) are added.
- [ ] `.env.example` and this file are updated if config or conventions changed.
