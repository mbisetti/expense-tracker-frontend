# Expense Tracker — Frontend ("Manguitos")

React + Vite + TypeScript frontend for the personal finance dashboard. Live app: https://expense-tracker-marko.up.railway.app

**Stack:** React 19 · Vite · TypeScript · TanStack Query · custom design system (no UI framework)

The backend is a **separate repo** (`expense-tracker-backend`, Spring Boot). This repo has no standalone deployment: production builds are packaged by the backend's Dockerfile, pinned to a commit via `ARG FRONTEND_REF` (**full 40-char SHA**).

## Development

Requirements: Node 18+, backend API running on :8080 (see backend repo — `./start-dev.sh`).

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
npx vitest run     # test suite
npx tsc -b         # typecheck
npm run build      # production build
```

## Structure

- `src/features/` — package by feature: `dashboard`, `transactions`, `accounts`, `expenses`, `income`, `transfers`, `budgets`, `savings`, `categories`, `paymentMethods`, `recurring`, `auth`, `settings`, `landing`, `dev`.
- `src/components/ui/` — design system (tokens light/dark in `index.css`, gallery at `/dev/ui`). Rules in `design-principles.md`: no new component bypasses the tokens/base components.
- `src/lib/` — http client with silent token refresh, formatting, theme, calendar prefs.

## Releasing to production

1. Push to `main`, copy the commit SHA (`git rev-parse HEAD` — full SHA).
2. In the backend repo: update `ARG FRONTEND_REF=<full-sha>` in the Dockerfile, commit, push.
3. Railway rebuilds with that exact frontend version. A frontend push alone deploys nothing (intentional).
