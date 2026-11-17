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
| Other modules | see `navConfig.js` | per role | "coming soon" placeholder |

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

- `src/assets/images/sinhsSeal.svg` is a placeholder — replace it with the official school seal.
- Scripts: `npm run lint`, `npm run format`, `npm run build`.
