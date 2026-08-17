# ShabooAgri CSS Architecture Reference

> **Updated 2026-08-17**: this doc originally also covered a Tailwind/`sa-`
> namespace collision risk from the commercial SaaS marketing site
> (`src/features/saas/saas.css`, which imported Tailwind utilities into the
> global production bundle). That site was removed entirely in commit
> `025587d` — there is no Tailwind anywhere in this frontend anymore, so
> that limitation no longer applies. The file inventory and naming
> convention below are still current and worth keeping.

## Architecture Overview & Ownership Rules

The frontend stylesheet architecture is organized into explicitly owned CSS files:

1. **Global Tokens & Base** (`src/styles/`):
   * `tokens.css`: `:root` Design Tokens & CSS Custom Properties only.
   * `base.css`: Universal CSS Reset (`box-sizing`), typography foundation, input primitives, alerts, loading spinner, and table row utilities.
   * `globals.css`: Keyframe animations (`@keyframes fadeIn`) and base master imports (`tokens.css`, `base.css`).
   * `index.css`: Root SPA import entry point (`@import "./styles/globals.css";`).
2. **UI Primitives** (`src/components/ui/`):
   * `Badge/badge.css`: Status badge variants (`.sa-badge-success`, `.sa-badge-warning`, `.sa-badge-danger`, `.sa-badge-info`, `.sa-badge-neutral`).
   * `Button/button.css`: Button primitive variants (`.sa-btn`, `.sa-btn-primary`, `.sa-btn-secondary`, `.sa-btn-danger`).
   * `Modal/modal.css`: Dialog shell & backdrop primitives (`.sa-modal-overlay`, `.sa-modal-content`).
   * `SearchableSelect/searchableSelect.css`: Searchable dropdown primitive.
3. **Application Layout Shells** (`src/layouts/`):
   * `app-layout.css`: Manager desktop sidebar, topbar & mobile slide-out drawer (`AppLayout.tsx`).
   * `driver-layout.css`: Driver mobile header & bottom navigation (`DriverLayout.tsx`).
   * `farmer-portal-layout.css`: Farmer customer portal header & bottom navigation (`FarmerPortalLayout.tsx`).
4. **Feature Modules** (`src/features/`):
   * Domain-owned feature stylesheets (`dashboard.css`, `bookings.css`, `jobs.css`, `customers.css`, `machines.css`, `drivers.css`, `employees.css`, `payments.css`, `expenses.css`, `fuel.css`, `maintenance.css`, `reports.css`, `settings.css`, `driver-mobile.css`, `farmer-mobile.css`, `login.css`, `placeholder.css`).

Note: every `.css` file bundles together into one production stylesheet regardless of which component imports it — there is no CSS module scoping. A class defined in one feature's stylesheet is visible (and can collide) everywhere.

## Namespace Discipline

The codebase stays collision-safe through naming convention, not tooling:
* Every component **must** use the `sa-` prefixed class naming convention (`.sa-card`, `.sa-sidebar`, `.sa-table`, `.sa-btn-primary`, `.sa-modal-content`).
* Before adding a new class, check it doesn't already exist with different intended styling elsewhere in the codebase — the global-bundle behavior above means a same-named class anywhere else in the app will collide with it.

## Verification Commands

```bash
npm run build   # tsc -b && vite build
npm run lint    # oxlint
```
