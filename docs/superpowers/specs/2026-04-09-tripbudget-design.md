# TripBudget — Architecture Design
**Date:** 2026-04-09
**Spec source:** `my_app.spec.md` v1.0

---

## 1. Approach

**Repository layer + feature modules (Approach B).**

All reads and writes go through typed repository classes that own domain logic. Components never touch Dexie directly. Google Drive sync attaches as a thin layer above repositories — adding it in step 12 requires no changes to UI code.

---

## 2. Folder Structure

```
src/
├── db/
│   ├── schema.ts                   # Dexie table definitions
│   ├── db.ts                       # Dexie singleton instance
│   └── repositories/
│       ├── TripRepository.ts
│       ├── DayRepository.ts
│       ├── StopRepository.ts
│       ├── TransportLegRepository.ts
│       ├── AccommodationRepository.ts
│       ├── ExpenseRepository.ts
│       ├── PackingRepository.ts
│       └── SettingsRepository.ts
├── features/
│   ├── trips/                      # Home screen + create/edit trip
│   ├── planner/                    # Plan tab — days, stops, transport
│   ├── calendar/                   # Calendar tab
│   ├── expenses/                   # Expenses tab
│   ├── map/                        # Map tab
│   ├── packing/                    # Packing tab
│   ├── summary/                    # Trip summary screen
│   └── settings/                   # Global settings screen
├── sync/
│   ├── GoogleDriveSync.ts          # Drive API client, upload/download
│   └── SyncManager.ts              # Trigger logic, debounce, status state
├── hooks/                          # Shared hooks (useLiveQuery wrappers, useSync)
├── components/                     # Shared UI components
├── lib/
│   ├── currency.ts                 # Frankfurter fetch + conversion
│   ├── geocoding.ts                # Nominatim place search
│   └── routing.ts                  # OSRM road routing
└── main.tsx
```

Each feature folder contains its own `components/` and `hooks/`, and calls into `db/repositories/` only.

---

## 3. Data Layer

### 3.1 Dexie Schema Changes vs. Spec

- `Stop.lat?: number` and `Stop.lng?: number` — optional; stops without coordinates are skipped on the map
- `TransportLeg.isOvernightTransport` — **not stored**; computed at read time from `arrivalDateTime` vs `departureDateTime`

### 3.2 Repository Contract

Every repository exposes the same interface:

```ts
getAll(tripId: string)   // returns useLiveQuery hook
getById(id: string)      // single record
save(entity)             // create or update; always sets updatedAt
delete(id: string)
```

### 3.3 Business Logic by Repository

| Repository | Owns this logic |
|---|---|
| `DayRepository` | On trip create: auto-generates one Day record per date in the trip's start–end range |
| `AccommodationRepository` | On save/delete: re-assigns `Day.accommodationId` for all days within checkIn–checkOut range |
| `TransportLegRepository` | On save: creates destination Stop on the day matching `arrivalDateTime`; geocodes via Nominatim if online |
| `ExpenseRepository` | Converts `amount` to trip default currency via cached rates before saving; stores rate snapshot |
| `SettingsRepository` | Single-row table (id = `"singleton"`); upsert only |

### 3.4 Exchange Rate Flow

`currency.ts` owns the Frankfurter API call. It checks `ExchangeRateCache` age on every expense interaction. If stale (>24h) and online, re-fetches silently. If stale and offline, raises a banner warning. Conversions always go through EUR as the base currency, matching the Frankfurter response format.

---

## 4. Navigation & Routing

React Router v6 for routing. Ionic for animated transitions and bottom tab bar.

```
/                             → Trips list (home)
/trips/new                    → Create trip form
/trips/:tripId/plan           → Plan tab (default inside trip)
/trips/:tripId/calendar       → Calendar tab
/trips/:tripId/expenses       → Expenses tab
/trips/:tripId/map            → Map tab
/trips/:tripId/packing        → Packing tab
/trips/:tripId/summary        → Trip summary (full screen, back to trip)
/settings                     → Global settings (full screen, back to home)
```

The trip shell is a layout route rendering the Ionic bottom tab bar and top header (trip name + back arrow + ⋯ menu). `IonTabs` keep-alive behavior preserves scroll position when switching tabs.

---

## 5. Stop Place Search

A shared Ionic modal used by both "add stop" and "add transport destination":

- **Online:** Nominatim search input + Leaflet map preview. User searches, taps a result, confirms pin. Stop saved with `lat`/`lng`.
- **Offline:** Modal falls back to a plain text input. Stop saved with no coordinates. Appears in the planner normally but is skipped on the Map tab.
- **Retroactive pinning:** Tapping an unpinned stop in the planner while online shows a "Pin on map" action that opens the search modal.

---

## 6. Transport Leg Creation Flow

Initiated from a specific stop in the Day Planner:

1. User taps "+ Transport" on a stop
2. Fills in: transport method, departure date/time, arrival date/time, destination name (via place search modal)
3. On save, `TransportLegRepository` creates:
   - The `TransportLeg` record (`fromStopId` = originating stop)
   - A new `Stop` on the day matching `arrivalDateTime` (`toStopId`)
   - If `arrivalDateTime` falls after the trip's `endDate`, the trip's `endDate` is extended and missing Day records are generated
   - On edit: if `arrivalDateTime` changes to a different date, the destination Stop is moved to the new day

Overnight transport is computed: if `arrivalDate > departureDate`, the leg appears as a transport block in the Calendar accommodation row.

---

## 7. Google Drive Sync

Single-user, no conflict resolution. Drive is cloud backup only.

**First login:** User chooses "Upload local → Drive" or "Download Drive → local" (one-time full replace).

**Ongoing sync:**
- Every `save()` / `delete()` call notifies `SyncManager`
- `SyncManager` debounces 30s, then uploads the affected `trip_{id}.json` and `settings.json`
- On app resume (document `visibilitychange` → visible): downloads latest files from Drive, overwrites local Dexie records

**Sync status** (header indicator at all times):

| State | Indicator |
|---|---|
| Synced | ✅ Synced |
| Syncing | 🔄 Syncing |
| Offline | ⚠️ Offline |
| Error | 🔴 Error — tap to retry |

Sync condition (Wi-Fi only / Wi-Fi + mobile / manual) is stored in `UserSettings` and read by `SyncManager` before every upload.

---

## 8. Offline & PWA Strategy

- **App shell:** precached by Workbox on install
- **OSM tiles:** cache-first, 500 tile limit
- **Nominatim / OSRM / Frankfurter:** network-first, fall back to last cached response
- **All user data:** always in Dexie (IndexedDB) — network never in the critical path
- **Persistent storage:** PWA install requests the `persist()` storage API so IndexedDB is not evicted under disk pressure

Dexie.js is ~24KB gzipped. All trip data for a typical user stays well under 10MB (text only, no photos in v1).

---

## 9. Error Handling

- **Nominatim / OSRM / Frankfurter failures:** non-blocking; app degrades gracefully (offline stop entry, no route lines, stale rate warning)
- **Dexie storage quota exceeded:** dismissible toast directing user to export data and clear storage
- **Google Drive errors:** sets `syncStatus = error`; user retries manually from Settings
- Each feature catches its own async failures locally — no global crash boundary

---

## 10. Testing Strategy

- **Unit tests (Vitest):** pure logic — currency conversion, budget pace calculations, accommodation day-assignment, overnight transport derivation
- **Repository tests:** against in-memory Dexie instance (no mocks)
- **Component tests (React Testing Library + Ionic):** critical flows — create trip, log expense, add stop (online and offline paths)
- **No E2E in v1:** manual testing on installed mobile PWA covers the gap

---

## 11. Tech Stack (Updated)

| Layer | Technology |
|---|---|
| Framework | React + Vite |
| Language | TypeScript |
| UI components | Ionic (mobile gestures, bottom sheets, tabs) |
| Storage | IndexedDB via Dexie.js |
| Routing | React Router v6 |
| Maps | Leaflet + OpenStreetMap |
| Geocoding | Nominatim (OpenStreetMap) |
| Road routing | OSRM (public API) |
| Currency | Frankfurter API (ECB rates) |
| PWA | Vite PWA Plugin (Workbox) |
| Hosting | AWS Amplify or Cloudflare Pages |
| Testing | Vitest + React Testing Library |

---

## 12. Build Order

Unchanged from spec (13 steps). Nominatim is available from step 3 (Day Planner) when stops are first created.
