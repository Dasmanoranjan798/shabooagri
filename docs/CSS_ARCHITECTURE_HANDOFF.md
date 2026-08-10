# ShabooAgri CSS Architecture Handoff & Maintenance Guidelines

---

## 1. Final Status & Classification

* **Final Classification**: `B. ARCHITECTURE ACCEPTED WITH DOCUMENTED COLLISION LIMITATION`
* **Verification Status**: **PASSED** (Build: PASS, Typecheck: PASS, Lint: PASS)
* **CSS Refactoring Status**: **CLOSED — No further CSS refactoring required.**

---

## 2. Architecture Overview & Ownership Rules

The frontend stylesheet architecture is organized into **27 explicitly owned CSS files**:

1. **Global Tokens & Base** (`src/styles/`):
   * `tokens.css`: `:root` Design Tokens & CSS Custom Properties only.
   * `base.css`: Universal CSS Reset (`box-sizing`), typography foundation, input primitives, alerts, loading spinner, and table row utilities.
   * `globals.css`: Keyframe animations (`@keyframes fadeIn`) and base master imports (`tokens.css`, `base.css`).
   * `index.css`: Root SPA import entry point (`@import "./styles/globals.css";`).
2. **UI Primitives** (`src/components/ui/`):
   * `Badge/badge.css`: Status badge variants (`.sa-badge-success`, `.sa-badge-warning`, `.sa-badge-danger`, `.sa-badge-info`, `.sa-badge-neutral`).
   * `Button/button.css`: Button primitive variants (`.sa-btn`, `.sa-btn-primary`, `.sa-btn-secondary`, `.sa-btn-danger`).
   * `Modal/modal.css`: Dialog shell & backdrop primitives (`.sa-modal-overlay`, `.sa-modal-content`).
3. **Application Layout Shells** (`src/layouts/`):
   * `app-layout.css`: Manager desktop sidebar, topbar & mobile slide-out drawer (`AppLayout.tsx`).
   * `driver-layout.css`: Driver mobile header & bottom navigation (`DriverLayout.tsx`).
   * `farmer-portal-layout.css`: Farmer customer portal header & bottom navigation (`FarmerPortalLayout.tsx`).
4. **Feature Modules** (`src/features/`):
   * 14 domain-owned feature stylesheets (`dashboard.css`, `bookings.css`, `jobs.css`, `customers.css`, `machines.css`, `drivers.css`, `employees.css`, `payments.css`, `expenses.css`, `fuel.css`, `maintenance.css`, `reports.css`, `settings.css`, `driver-mobile.css`, `farmer-mobile.css`, `login.css`).
5. **Commercial SaaS Website** (`src/features/saas/`):
   * `saas.css`: Encapsulated `@import "tailwindcss/theme"` and `@import "tailwindcss/utilities"` imports for the marketing landing site.

---

## 3. Documented Architectural Limitation & Discipline Rules

### A. SaaS Global-Bundle Limitation
Because `SaasHomePage` is imported statically in `App.tsx`, Vite aggregates `src/features/saas/saas.css` into the main production CSS bundle (`dist/assets/index-*.css`). Un-prefixed Tailwind utility class selectors (such as `.flex`, `.grid`, `.hidden`, `.relative`, `.absolute`, `.w-full`, `.text-white`, `.bg-slate-900`) exist globally within the compiled production CSS bundle.

### B. Business OS `sa-*` Namespace Requirement
The codebase is **collision-safe through namespace discipline**:
* All Business OS components **MUST strictly use custom B2B `sa-` prefixed class names** (`.sa-card`, `.sa-sidebar`, `.sa-table`, `.sa-btn-primary`, `.sa-modal-content`).
* Developers working on Business OS components **MUST NOT write un-prefixed Tailwind utility class names** (`flex`, `grid`, `w-full`, `bg-slate-900`) directly on Business OS elements, as those classes will resolve against the bundled Tailwind utilities.

---

## 4. Verification Commands & Results

```bash
# Build & Typecheck Verification
npm run build
# Result: PASS (tsc -b && vite build completed in 1.77s with 0 errors)

# Linter Verification
npm run lint
# Result: PASS (Oxlint completed on 117 files with 0 errors)
```
