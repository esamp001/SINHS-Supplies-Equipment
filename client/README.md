# SINHS Supplies & Equipment — Client (static prototype)

React + Vite + Ant Design front end. Follows the conventions in `../AGENTS.md`.

## Run

```bash
cd client
npm install
npm run dev            # http://localhost:5173
```

## Prototype mode (static, no backend)

- All data is static: shared demo data is in `src/data/staticData.js`; page-specific data (dashboard
  numbers and lists) is inline in each page's config (`src/pages/dashboard/dashboardConfig.js`).
- Sign-in checks the demo accounts and keeps the user in memory only — reloading the page signs out.
- Changes on the Users page (approve, reject, change role, deactivate) live in page state and reset
  when you leave the page or reload.
- There is no API layer yet. When the backend starts, add `src/api/` (fetch wrapper with
  `credentials: 'include'`) and replace the static data per AGENTS.md §4.4.

Demo accounts (password `password123`): `admin`, `custodian`, `staff`, and `liza.bautista` (pending).

## Role-based access

`src/routes/navConfig.js` defines each role's menu (`NAV_GROUPS_BY_ROLE`) and which roles can open each
page. `ProtectedRoute` sends users without access back to their dashboard.

| Screen | Path | Roles |
|--------|------|-------|
| Sign in | `/login` | public |
| Create account (self-registration) | `/register` | public |
| Dashboard (per role) | `/dashboard` | all |
| Users & roles | `/users` | admin |
| Other modules ("coming soon") | see `navConfig.js` | per role |

## Styling

Ant Design theme tokens (`src/theme/antdTheme.js`) + inline `style={}` only. No CSS files.
Shared inline styles are in `src/theme/sharedStyles.js`.

## Notes

- `src/assets/images/sinhsSeal.svg` is a placeholder — replace it with the official school seal.
- Scripts: `npm run lint`, `npm run format`, `npm run build`.
