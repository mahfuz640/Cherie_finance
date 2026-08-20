# Cherie's Finance — Codex Memory

> Read this first. Keep it short and update only when project behavior or structure changes.

## Goal

Full-stack company finance app for finance tracking, product inventory/sales, cross-approved money requests, shared work planning, and personal account security.

## Stack

- Frontend: React + Vite in `frontend/`; `main.jsx` bootstraps `App.jsx`, with reusable UI in `frontend/src/components/`
- Backend: Express in `backend/`; API entry is `backend/index.js`
- Database: MongoDB Atlas via the official `mongodb` driver; connection is configured only in `backend/.env`
- Auth: JWT + bcrypt password hashes
- Run: `npm run dev`
- Build check: `npm run build`
- URLs: frontend `http://localhost:5173`, API `http://localhost:4000`

## Roles and Rules

| Role | Password (demo only) | Permission |
|---|---|---|
| Admin | `admin123` | Full access; review any request |
| Nadiya (Director) | `nadiya123` | Create requests; review Mahfuz's requests |
| Mahfuz (CEO) | `mahfuz123` | Create requests; review Nadiya's requests |

Critical rule: Nadiya cannot approve her own request, and Mahfuz cannot approve his own request. The other director must review it. Admin is the only override.

Task rule: Nadiya and Mahfuz may assign themselves or each other; Admin may assign Admin, Nadiya, or Mahfuz. Plans include shared notes, date, and time. Only the assignee or Admin updates task status. Every authenticated user may change only their own password.

## Finance Logic

- Investment increases total invested/company money.
- Approved request increases paid requests and reduces remaining/company money.
- Transactions: `sale`, `stock`, `expense`, `loan`, `loan_payment`.
- Product creation records stock quantity/cost; product sales reduce available inventory and record finance sale quantity/revenue.
- Profit and company money subtract stock purchase cost.
- Dashboard calculations are performed in `GET /api/dashboard`.
- All state-changing endpoints require an active Admin, Nadiya, or Mahfuz account.

## Main API

- `POST /api/login`
- `GET /api/health`
- `GET /api/dashboard`
- `POST /api/investments`
- `PATCH /api/investments/:id`
- `DELETE /api/investments/:id`
- `POST /api/requests`
- `PATCH /api/requests/:id`
- `PATCH /api/requests/:id/details`
- `DELETE /api/requests/:id`
- `POST /api/transactions`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `PATCH /api/account/password`
- `PATCH /api/team/:id` (Admin only)
- `GET /api/catalog`
- `POST /api/categories`
- `POST /api/products`
- `POST /api/products/:id/sales`

## Codex Working Rules

1. Read this file before inspecting the whole repository.
2. Preserve the request cross-approval rule and server-side authorization.
3. Do not commit `.env`, `node_modules`, frontend build output, or database credentials.
4. Reuse existing components/styles before adding packages or files.
5. After code changes, run the smallest relevant check; run `npm run build` for frontend changes.
6. Update this file only for lasting architecture, behavior, command, or pending-work changes—never add a verbose activity log.
7. Keep responses and code changes focused to reduce token usage.

## Current State

- Initial application implemented.
- SQLite data was migrated to MongoDB Atlas and the SQLite driver was removed. The unused local `backend/finance.db` backup remains ignored because environment policy blocked its verified deletion.
- Frontend and backend are separated into npm workspaces under `frontend/` and `backend/`.
- Frontend pages and UI sections are split into reusable files under `frontend/src/components/`.
- Visual theme uses the rose/pink design overrides in `frontend/src/theme.css`.
- Product codes are generated atomically by MongoDB as `CF-000001`, and existing uncoded products are backfilled at backend startup.
- `ProductCatalog.jsx` provides categories, images, automatic product codes, brand/supplier/unit metadata, purchase/expiry dates, low-stock alerts, notes, inventory value, and timed sales/profit history.
- Request owners can edit/delete pending or rejected requests; editing a rejected request returns it to pending. Approved requests are immutable except for Admin. Investment owners can edit/delete their records at any time, while Admin can manage every request and investment.
- The Overview page has no Quick Entry card; it focuses on request and investment management.
- Phone/tablet overrides live in `frontend/src/responsive.css`, including fixed bottom navigation, touch sizing, bottom-sheet modals, and card-style request/investment/sales tables; product-specific styles are in `frontend/src/catalog.css`.
- Shared Work Plan supports self/cross-assignment, priority, planning notes, date, time, and status tracking.
- Admin assigns Nadiya/Mahfuz dynamic designations and responsibility notes on the shared Team page; identity roles and approval logic remain unchanged.
- Password page lets each authenticated user change their own password after current-password verification.
- Render production deploy is a single Node Web Service defined by `render.yaml`: Express serves `frontend/dist`, production frontend calls same-origin `/api`, Node is pinned by `.node-version`, and Mongo startup has bounded retry for transient Atlas TLS failures.
- Dependency installation and production build completed successfully.
- No known pending task.

## Next Task

Replace this line with the active unfinished task when work begins; set it back to `None` when finished.

`None`
