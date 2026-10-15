# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TripBudget: an offline-first PWA for trip planning and expense tracking. React 18 + Ionic React 8 + Vite 8 + TypeScript 6. No backend; all data lives in IndexedDB via Dexie. Deployed to GitHub Pages from `master` (`.github/workflows`), served under the `/tripBudgetApp/` base path (set in `vite.config.ts`, applied as the router basename in `src/App.tsx`).

Product spec: `my_app.spec.md`. Design/implementation history: `docs/superpowers/{specs,plans}/`. The README's "Planned (not yet built)" list is stale: Calendar, Expenses, Map, Packing and Summary are all implemented.

## Commands

```bash
npm install            # .npmrc sets legacy-peer-deps=true
npm run dev            # Vite dev server, http://localhost:5173
npm run build          # tsc -b && vite build  (type errors fail the build)
npm run lint           # eslint .
npm run test           # vitest watch mode
npm run test:run       # vitest once (what CI would run)
npm run coverage       # vitest run --coverage
npx vitest run src/db/repositories/__tests__/TripRepository.test.ts   # single file
npx vitest run -t "creates stop"                                      # by test name
```

Node 20 is used in CI. `VITE_GOOGLE_CLIENT_ID` is the only env var; it is read in `src/sync/GoogleDriveSync.ts` and Google Drive sync is a no-op without it.

## Architecture

### Data layer: repositories own all writes

- `src/db/schema.ts` holds every entity interface. Dates are `YYYY-MM-DD` strings, datetimes are ISO strings, ids are UUIDs. `Accommodation.checkOut` is exclusive (hotel-style).
- `src/db/db.ts` is the Dexie instance. Schema changes require a new `this.version(n).stores({...})` block; never edit an existing version.
- `src/db/repositories/*Repository.ts` are plain objects mixing `useXxx()` hooks (wrapping `useLiveQuery`) with async `create/update/delete`. **Components and feature hooks must go through repositories, never `db` directly**, because repositories carry cross-entity side effects:
  - `TripRepository.create/update` regenerate `Day` rows for the date range (`DayRepository`).
  - `TransportLegRepository.create` auto-creates the destination `Stop`, may extend the trip's `endDate` (creating days) when the arrival date is past it, and upserts a linked `Expense` (category `cat-transport`, or `cat-experience` for `method: 'tour'`). Delete removes the stop and expense.
  - `AccommodationRepository` upserts one `Stop` per occupied day (tagged with `accommodationId`), sets `Day.accommodationId`, and syncs a linked `Expense`.
  - `ExpenseRepository.create/update` convert `amount` to the trip's `defaultCurrency` via `lib/currency.ts` and store `amountConverted`/`convertedAt`.
  - Every mutating repository calls `TripRepository.touch(tripId)` so `trip.updatedAt` advances. That timestamp drives last-write-wins in Google Drive sync, so new write paths must keep doing this.
- `ExpenseCategoryRepository.ensureSeeded()` runs at startup (`main.tsx`); default category ids are `cat-<label>` and are referenced by id elsewhere.

### Features

`src/features/<feature>/components` + `hooks`. Feature hooks are thin wrappers over repository hooks (e.g. `useStops` -> `StopRepository.useByDayId`). Routes: `/` (trips list), `/settings`, and `/trips/:tripId/*` which mounts `components/TripShell.tsx`, an `IonTabs` shell with plan / calendar / expenses / map / packing tabs (plus an un-tabbed `summary` route).

### Sync and external services

- `src/sync/SyncManager.ts`: repositories call `notifyDataChanged(tripId)`, which debounces (3s) an upload of that trip as `trip_<id>.json` to a Google Drive folder, gated by the user's `syncCondition` setting and `navigator.onLine`. `performFullSync` merges by comparing `trip.updatedAt`, with a special case that merges packing items even when local is newer. Trip JSON is produced by `lib/exportImport.ts`, which is also the manual export/import format in Settings.
- `src/sync/GoogleDriveSync.ts`: Google Identity Services token client; the GIS script is loaded in `index.html` and polled for in `main.tsx`.
- `lib/currency.ts`: Frankfurter rates (EUR base) cached in the `exchangeRateCache` table, stale after 24h; stale cache is returned immediately and refreshed in the background.
- `lib/geocoding.ts` (Photon), `lib/routing.ts` (OSRM road routes, great-circle fallback). These hosts plus OSM tiles have Workbox runtime caching rules in `vite.config.ts`; add a rule there when introducing a new external API.

## Testing conventions

- Vitest with jsdom and `globals: true`; `src/test/setup.ts` loads jest-dom and `fake-indexeddb/auto`, so repository tests hit a real Dexie instance. Clear the tables you use in `beforeEach` (the DB is shared across tests in a file).
- Component tests mock Ionic with `vi.mock('@ionic/react', () => ionicMock)` from `src/components/__mocks__/ionic.tsx`. Add a component there if you use a new Ionic element in a tested component.
- Component tests mock child components, feature hooks, `dexie-react-hooks`, and `db/db` directly rather than seeding the database (see `features/planner/components/__tests__/DayCard.test.tsx`).

## Gotchas

- `tsconfig.app.json` has `noUnusedLocals`/`noUnusedParameters` and `verbatimModuleSyntax`: use `import type` for types and remove unused imports or the build fails.
- `TransportLeg` has no stored overnight flag; use `isOvernightTransport()` from `TransportLegRepository`.
- Stops created by accommodations or transport legs are owned by those entities; deleting them directly in a stop UI will desync the parent.
