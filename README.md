# TripBudget

A mobile-first, offline-capable trip planner and budget tracker built with React and Ionic. Plan itineraries day by day, track transport and accommodation, log expenses in any currency, and keep a packing list. Everything is stored locally in the browser, with optional backup and sync to Google Drive.

**Live app:** https://olgagovor.github.io/tripBudgetApp/

## Features

- **Trips.** Create trips with a destination, dates, default currency, budget (total and/or daily), emoji and color.
- **Plan.** A card for every day of the trip, with notes and reorderable stops. Place search fills in coordinates for the map.
- **Transport.** Legs between stops by car, bus, train, plane, walk, boat, ferry or tour, with booking status, times and price. Adding a leg creates the destination stop, and extends the trip if the arrival is after its end date. Overnight journeys are detected from the dates.
- **Accommodation.** Bookings with check-in and check-out dates, status, link and price. Each booking is shown on every night it covers.
- **Calendar.** A month view of the trip showing accommodation status, transport, and nights with nothing booked.
- **Expenses.** Expenses in any currency, converted to the trip's currency and grouped by day and category, with a budget bar. Transport and accommodation prices become expenses automatically. Categories can be customised in Settings.
- **Map.** All pinned stops on an OpenStreetMap map. Road routes are drawn for car and bus legs, arcs for flights, and straight lines for other legs.
- **Packing.** A checklist with optional item weights and a running total.
- **Summary.** Total spend, spend by category and by month, and packing progress.
- **Settings.** Google Drive sign-in and sync conditions, first day of the week, expense categories, JSON export and import, and clearing local data.
- **Offline and installable.** Works without a connection after the first load, and can be installed as a PWA on mobile and desktop.

## Tech Stack

| Layer | Library or service |
|---|---|
| UI framework | Ionic React 8, React 18 |
| Routing | Ionic React Router, React Router v5 |
| Local database | Dexie (IndexedDB), dexie-react-hooks |
| Maps | Leaflet, react-leaflet, OpenStreetMap tiles |
| Place search | Photon (komoot), no API key |
| Road routing | OSRM public API |
| Exchange rates | Frankfurter (ECB rates), no API key |
| Cloud sync | Google Drive API via Google Identity Services |
| Build | Vite 8, TypeScript 6 |
| PWA | vite-plugin-pwa (Workbox) |
| Testing | Vitest, Testing Library, fake-indexeddb |

## Getting Started

Requires **Node 24**, pinned in `.nvmrc`. With nvm or fnm, run `nvm use` or `fnm use` in the project folder.

```bash
npm install
npm run dev        # http://localhost:5173/tripBudgetApp/
```

Google Drive sync needs a Google OAuth client ID. Put it in a `.env.local` file:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Without it the app works normally, and Drive sync is unavailable.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run coverage` | Run tests with a coverage report |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── App.tsx              # Routes: /, /settings, /trips/:tripId/*
├── main.tsx             # Startup: Ionic setup, category seeding, Drive token restore
├── components/          # TripShell (tab bar), sync status badge, shared test mocks
├── db/
│   ├── schema.ts        # All entity interfaces
│   ├── db.ts            # Dexie database and schema versions
│   └── repositories/    # Data access; all writes go through here
├── features/            # One folder per screen: trips, planner, calendar,
│                        # expenses, map, packing, summary, settings
├── lib/                 # Currency, geocoding, routing, budget, export/import
└── sync/                # Google Drive client and sync manager
```

Inside a trip the routes are `/trips/:tripId/plan`, `calendar`, `expenses`, `map`, `packing` and `summary`.

## Data Model

All data lives in IndexedDB. Dates are `YYYY-MM-DD` strings and ids are UUIDs.

- **Trip.** The top-level container. Owns the start and end dates, default currency and budget.
- **Day.** One row per date in the trip, regenerated automatically when the trip dates change.
- **Stop.** A place visited on a day, with optional coordinates and links.
- **TransportLeg.** A journey from one stop to another.
- **Accommodation.** A booking covering a range of nights. Check-in is inclusive and check-out is exclusive, like a hotel. Creates a stop on each night it covers.
- **Expense.** An amount in any currency, with the converted amount in the trip's currency. Optionally linked to a day, transport leg or accommodation.
- **ExpenseCategory.** Shared across trips. Defaults are seeded on first launch.
- **PackingItem.** A checklist item with an optional weight.
- **ExchangeRateCache** and **UserSettings.** Cached rates, refreshed after 24 hours, and app settings.

Repositories keep related records consistent. Creating a transport leg or accommodation also creates its stops and linked expense, and deleting it removes them.

## Sync

When signed in to Google, each trip is saved as a JSON file in a `TripBudget` folder in the user's Drive. Changes upload a few seconds after editing, subject to the sync setting of Wi-Fi only, Wi-Fi and mobile data, or manual. On startup the app downloads trips and keeps whichever copy was updated most recently. The same JSON format is used by the manual export and import in Settings.

## Testing

Repository tests run against a real Dexie database backed by `fake-indexeddb`. Component tests mock Ionic with the shared mock in `src/components/__mocks__/ionic.tsx`.

```bash
npm run test:run                                    # all tests
npx vitest run src/lib/__tests__/currency.test.ts   # one file
npx vitest run -t "converts"                        # tests matching a name
```

## CI and Deployment

- **CI** runs tests and a production build on every push and on pull requests from forks. Lint also runs but doesn't fail the build yet.
- **Deployment** to GitHub Pages runs on every push to `master`, after the tests pass. The app is served under `/tripBudgetApp/`.
