# TripBudget

A mobile-first, offline-capable trip planning and budgeting app built with React and Ionic. Plan itineraries day-by-day, track stops, transport, and accommodation — all stored locally in the browser.

## Features

- **Trip management** — create trips with destination, dates, budget, emoji, and color
- **Day-by-day planner** — auto-generated daily view for the trip duration with per-day notes
- **Stops** — add points of interest per day; optional geocoding via Nominatim
- **Transport legs** — track journeys between stops (car, bus, train, plane, walk, boat, ferry) with booking status and departure/arrival times
- **Accommodations** — manage hotel bookings with check-in/check-out, booking links, and status
- **Offline-first** — all data stored in IndexedDB via Dexie; works without a network connection
- **PWA** — installable on mobile and desktop

**Planned (tabs available, not yet built):** Calendar view, Expense tracking, Map view, Packing list

## Tech Stack

| Layer | Library |
|---|---|
| UI framework | Ionic React 8 |
| Routing | Ionic React Router + React Router v5 |
| Local database | Dexie (IndexedDB) + dexie-react-hooks |
| Build | Vite 8 |
| Language | TypeScript 6 |
| Testing | Vitest + Testing Library |
| PWA | vite-plugin-pwa |
| Geocoding | OpenStreetMap Nominatim (free, no key needed) |

## Project Structure

```
src/
├── App.tsx                  # Routes: /, /trips/:tripId, /settings
├── components/
│   └── TripShell.tsx        # 5-tab shell (Plan / Calendar / Expenses / Map / Packing)
├── db/
│   ├── schema.ts            # All entity interfaces (Trip, Day, Stop, TransportLeg, …)
│   ├── db.ts                # Dexie database definition
│   └── repositories/        # Data access layer — all writes go through repositories
├── features/
│   ├── trips/               # Trip list page + create/edit modal
│   ├── planner/             # Day cards, stops, transport, accommodation
│   └── settings/            # Settings page (placeholder)
└── lib/
    └── geocoding.ts         # Nominatim place search
```

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI) |
| `npm run coverage` | Generate coverage report |
| `npm run lint` | ESLint |

## Data Model

All data lives in IndexedDB. Entities:

- **Trip** — top-level container; owns `startDate`/`endDate`
- **Day** — one row per calendar date within the trip; regenerated automatically when trip dates change
- **Stop** — a location visited on a given day; optional lat/lng from geocoding
- **TransportLeg** — a journey from one stop to another; creating a leg auto-creates the destination stop and extends the trip end date if needed
- **Accommodation** — linked to a day range (check-in inclusive, check-out exclusive); auto-assigned to all days in the range

## Testing

Tests use Vitest with `fake-indexeddb` for repository tests and a shared Ionic mock for component tests.

```bash
npm run test:run   # 29 tests across 9 suites
```
