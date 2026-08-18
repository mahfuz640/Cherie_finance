# Cherie's Finance

A React + Express + MongoDB Atlas company finance dashboard with role-based access and cross-approval for money requests.

## Project structure

```text
frontend/   React + Vite application
backend/    Express API + MongoDB Atlas connection
```

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

## Demo accounts

| Profile | Password | Access |
|---|---|---|
| Admin | `` | Full access and request review |
| Nadiya (Director) | `` | Create requests; approve Mahfuz's requests; assign Mahfuz tasks |
| Mahfuz (CEO) | `` | Create requests; approve Nadiya's requests; assign Nadiya tasks |

Data is persisted in MongoDB Atlas. Configure `MONGODB_URI`, `MONGODB_DB`, and `JWT_SECRET` in `backend/.env` (see `backend/.env.example`).

## Finance entries

- Investments update the invested balance.
- Approved money requests reduce the available company balance.
- Sales, expenses, stock, loans, and loan payments update dashboard totals.
- Pending Nadiya/Mahfuz requests can only be approved by the other person (Admin can review either).

## Product and inventory

- Create reusable product categories.
- Add item/product names, SKU, brand, supplier, unit, image, notes, purchase/expiry dates, opening quantity, and per-item buy price.
- Configure a low-stock alert quantity and see warnings on affected products.
- Record a sale with sell quantity, per-item sell price, and exact selling date/time.
- Each sale reduces available stock and appears in shared history with buy cost, gross profit, recorder, and selling time.
- Product purchases and sales automatically update finance stock, selling, and profit totals.
- Images are stored with product records in MongoDB and are limited to 2 MB each.
- Product cards, forms, tables, navigation, and all existing pages are mobile responsive.

## Work plan and account security

- Nadiya and Mahfuz can plan tasks for themselves or assign tasks to each other.
- Admin can plan for Admin, Nadiya, or Mahfuz.
- Every task includes priority, planning notes, date, and time, and is visible to the whole team.
- The assigned person updates a task from To do to In progress or Completed.
- Every user can change their own password from the Password page using their current password.
- Demo passwords above are the initial seeded passwords and stop working after that account changes its password.

## Team responsibilities

- Everyone can see the shared Team Responsibilities page.
- Admin selects Nadiya or Mahfuz and assigns a designation from the available management roles.
- Admin can write detailed responsibilities for each person; changes appear dynamically in team cards, profiles, and the sidebar.
- System login identities and cross-approval rules remain unchanged when a designation changes.
