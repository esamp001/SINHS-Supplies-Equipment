# SINHS Supplies & Equipment — Client

React + Vite + Ant Design front end. Follows the conventions in `../AGENTS.md`.

## Run

Start the API first (see `../server/README.md`), then:

```bash
cd client
npm install
npm run dev            # http://localhost:5173 (proxies /api to http://localhost:4000)
```

Demo accounts (password from the server's `SEED_DEFAULT_PASSWORD`, default `password123`):
`admin`, `custodian`, `staff`.

## What's connected to the API

| Screen | Path | Roles | Data |
|--------|------|-------|------|
| Sign in | `/login` | public | API (httpOnly cookie session) |
| Create account | `/register` | public | API (positions + registration) |
| Change password | `/change-password` | signed in | API (forced after an admin reset) |
| Users & roles | `/users` | admin | API (approve/reject, role, reset password, status) |
| Dashboard (per role) | `/dashboard` | all | API (`GET /dashboard/summary`; layout in `dashboardConfig.js`) |
| Items | `/items` | admin, custodian | API (items, units, stock-in, adjustments) |
| Stock transactions | `/stock-transactions` | admin, custodian | API (ledger, stock-in, adjustments, reconcile check) |
| Requests | `/requests` | admin, custodian | API (approve/partial, reject, release) |
| Borrowing & returns | `/borrowing` | admin, custodian | API (borrow records, returns) |
| Item types & fields | `/item-types` | admin, custodian | API (types and custom fields) |
| Reports | `/reports` | admin, custodian | API (preview + Excel/PDF download) |
| Master data | `/master-data` | admin | API (categories, units, locations, positions) |
| Audit log | `/audit-log` | admin | API (read-only, filters) |
| Available items | `/available-items` | staff | API (pick items, submit a request) |
| My requests | `/my-requests` | staff | API (own requests, cancel pending) |
| My borrowed items | `/my-borrowed` | staff | API (own borrow records) |
| Notification bell | header | all | API (unread count every 60s, recent list, mark read) |

- API calls go through `src/api/httpClient.js` (native `fetch`, `credentials: 'include'`).
- Pages call `src/api/*.api.js` functions directly — in `useEffect` to load data and in event
  handlers for actions. There are no custom data hooks.
- The session is restored on page load from `GET /auth/me`, so reloading keeps you signed in.

## Role-based access

`src/routes/navConfig.js` defines each role's menu and which roles can open each page.
`ProtectedRoute` sends users without access back to their dashboard; the server enforces every rule.

## Styling

Ant Design theme tokens (`src/theme/antdTheme.js`) + inline `style={}` only. No CSS files.

## Notes

- `src/assets/images/sinhsSeal.png` is the official school seal (transparent background), shown by `BrandMark` on the sign-in, registration and header.
- Scripts: `npm run lint`, `npm run format`, `npm run build`.
