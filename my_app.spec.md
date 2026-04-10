# TripBudget — Travel Planner & Budget Tracker
## Product Specification v1.0

---

## 1. Overview

**TripBudget** is an offline-first Progressive Web App (PWA) for planning trips and tracking travel expenses. It runs entirely in the browser, can be installed on mobile and desktop, and works without an internet connection after the first load. No backend server is required.

**Primary use case:** Mobile-first travel companion used during a trip for day-by-day planning, accommodation tracking, transport booking status, and expense logging in multiple currencies.

---

## 2. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | React + Vite | Fast build, great ecosystem |
| Language | TypeScript | Type safety across data model |
| Storage | IndexedDB via Dexie.js | Structured offline storage |
| Maps | Leaflet + OpenStreetMap | Free, offline tile caching possible |
| Road routing | OSRM (public API) | Free road/path routing |
| Currency | Frankfurter API (ECB rates) | Free, no API key needed |
| PWA | Vite PWA Plugin (Workbox) | Service worker, installable |
| Hosting | AWS Amplify or Cloudflare Pages | Free static hosting, global CDN |

---

## 3. App Architecture

### 3.1 PWA & Offline Strategy

- App shell cached on first load via Workbox service worker
- All data stored in IndexedDB (Dexie.js) — no network required for core features
- Exchange rates fetched when online and cached with a timestamp; stale if older than 24h
- Map tiles cached progressively as user browses maps
- If offline, last cached exchange rates are used with a visible warning

### 3.2 Navigation Structure

**Home screen:** Trip list

**Inside a trip — bottom navigation (5 tabs):**
1. Plan (day-by-day itinerary)
2. Calendar (timeline / accommodation overview)
3. Expenses (log & budget)
4. Map (route visualization)
5. Packing (checklist + weight)

---

## 4. Data Model

All data lives in IndexedDB. Below is the full schema.

### Trip
```
Trip {
  id:              string (uuid)
  name:            string
  destination:     string
  emoji:           string          // cover visual e.g. "🇯🇵"
  coverColor:      string          // hex color for card background
  startDate:       string          // ISO date "YYYY-MM-DD"
  endDate:         string          // ISO date "YYYY-MM-DD"
  defaultCurrency: string          // ISO 4217 e.g. "PLN"
  budget: {
    total?:        number          // optional total trip budget
    dailyAmount?:  number          // optional per-day budget
  }
  createdAt:       string
  updatedAt:       string
}
```

### Day
```
Day {
  id:              string (uuid)
  tripId:          string
  date:            string          // ISO date
  dayNumber:       number          // 1-based
  notes?:          string          // freeform markdown/text scratchpad
  accommodationId?: string         // ref to Accommodation (optional)
}
```
> Days with no stops are valid — they show accommodation + notes only.

### Stop
```
Stop {
  id:              string (uuid)
  dayId:           string
  order:           number          // for manual reordering
  placeName:       string
  placeLink?:      string          // URL
  usefulLinks:     Link[]
}

Link {
  label:           string
  url:             string
}
```

### TransportLeg
```
TransportLeg {
  id:              string (uuid)
  tripId:          string
  fromStopId:      string          // ref to Stop
  toStopId:        string          // ref to Stop
  method:          "car" | "bus" | "train" | "plane" | "walk" | "boat" | "ferry"
  status:          "not_booked" | "booked" | "booked_paid"
  departureDateTime?: string       // ISO datetime (optional)
  arrivalDateTime?:   string       // ISO datetime (optional)
  isOvernightTransport: boolean    // derived: arrivalDate > departureDate
  notes?:          string
  bookingLink?:    string
  usefulLinks:     Link[]
}
```
> If `isOvernightTransport` is true, the transport leg is shown in the accommodation timeline as a transport block (bus/train icon spanning the night).

### Accommodation
```
Accommodation {
  id:              string (uuid)
  tripId:          string
  name:            string
  link?:           string          // property website
  status:          "not_booked" | "booked" | "booked_paid"
  checkIn:         string          // ISO date
  checkOut:        string          // ISO date (exclusive — hotel-style)
  confirmationLink?: string
  usefulLinks:     Link[]
}
```
> Accommodation spans multiple days. Each Day references one Accommodation by id. Gaps (no accommodation) are shown as warnings in calendar view.

### Expense
```
Expense {
  id:              string (uuid)
  tripId:          string
  dayId?:          string          // optional — can be trip-level
  categoryId:      string          // ref to ExpenseCategory
  amount:          number
  currency:        string          // ISO 4217
  amountConverted: number          // in trip's defaultCurrency
  convertedAt:     string          // ISO datetime of rate snapshot
  note?:           string
  date:            string          // ISO date
}
```

### ExpenseCategory
```
ExpenseCategory {
  id:              string (uuid)
  label:           string
  color:           string          // hex
  icon:            string          // from preset icon set
}
```
**Default categories (pre-seeded, fully editable):**
- 🏨 Accommodation — #4A90D9
- 🚌 Transport — #7B68EE
- 🍕 Food — #F5A623
- 📦 Other — #9B9B9B

User can rename, recolor, change icon, delete, or add new categories. Managed in global Settings.

### PackingItem
```
PackingItem {
  id:              string (uuid)
  tripId:          string
  label:           string
  checked:         boolean
  weightGrams?:    number
}
```
> On new trip creation, user can copy packing list from any previous trip. Items are imported unchecked, weights preserved. Total weight displayed at bottom of list.

### ExchangeRateCache
```
ExchangeRateCache {
  base:            string          // e.g. "EUR"
  rates:           Record<string, number>
  fetchedAt:       string          // ISO datetime
}
```
> Rates fetched from `api.frankfurter.app/latest`. Cached in IndexedDB. Considered stale after 24 hours. If offline and stale, app shows a warning but uses last known rates.

### UserSettings
```
UserSettings {
  firstDayOfWeek:  "monday" | "sunday"
  syncCondition:   "wifi" | "wifi_and_mobile" | "manual"
  googleConnected: boolean
  lastSyncedAt?:   string          // ISO datetime
}
```

---

## 5. Feature Specifications

### 5.1 Trips List (Home Screen)
- Cards showing: emoji, name, destination, date range, days count
- Color-coded card background per trip
- Budget progress bar on card if budget is set
- Tap → open trip
- Long-press / swipe-left → Edit / Delete
- FAB button → Create new trip

### 5.2 Day Planner (Plan Tab)
- Vertical list of days, collapsible
- Each day card shows:
  - Day number + date + day of week
  - Stops list (ordered, draggable to reorder)
  - Transport legs between stops with method icon + booking status badge
  - Accommodation block with status badge
  - Notes preview (tap to expand)
- Add/edit/delete stops, transport legs, accommodation inline
- All link fields open in system default browser
- Transport method is optional per leg
- Booking status badges:
  - 🔴 Not booked
  - 🟡 Booked
  - 🟢 Booked & Paid

### 5.3 Calendar View (Calendar Tab)

**Layout: Hybrid Monthly Calendar with Trip Overlay**
A standard monthly calendar grid where trip-specific data is overlaid on top. Combines the familiarity of a regular calendar with travel-specific visual layers.

**Accommodation bars**
Multi-night accommodation rendered as a horizontal colored bar spanning the relevant days — similar to multi-day events in Google Calendar. Bar carries the accommodation name and a status color:
- 🟢 Green bar = Booked & Paid
- 🟡 Yellow bar = Booked (not yet paid)
- 🔴 Red bar = Not booked
- 🔵 Blue/purple bar = Overnight transport (bus/train replacing accommodation)

Bars span across day cells and wrap to the next row if they cross a week boundary.

**Each day cell shows:**
- Calendar date (top)
- Trip day number (e.g. "Day 7") if within trip dates
- Main destination or stop name (truncated)
- Small transport icon(s) for legs departing that day
- Budget indicator dot: 🟢 under / 🟡 at limit / 🔴 over

**Days outside trip dates** are greyed out and non-interactive.

**Gaps in accommodation** (nights with no accommodation and no overnight transport) are highlighted with a subtle red background — indicating an unplanned night.

**Filter buttons** (above the calendar):
- Next 10 days
- Next 20 days
- Next 30 days
- Whole trip (default)

Selecting a filter scrolls/jumps the calendar to today and highlights the relevant range.

**Interaction:**
- Tap any day within trip dates → opens Day Planner tab scrolled to that day
- Tap an accommodation bar → opens accommodation detail/edit sheet
- Month navigation: left/right arrows + "Today" / "Trip start" jump buttons

### 5.4 Expenses (Expenses Tab)
- Log expense: amount, currency, category, date, optional day link, note
- Currency auto-converts to trip default currency using cached ECB rates
- Conversion rate and timestamp shown on each expense
- **Budget tracking logic:**
  - If `dailyAmount` budget set:
    - `cumulativeBudget(day N) = dailyAmount × N`
    - `cumulativeSpent(day N) = sum of all expenses up to day N`
    - 🟢 Green: spent < 95% of cumulative budget
    - 🟡 Yellow: spent 95–100% of cumulative budget
    - 🔴 Red: spent > cumulative budget
  - If only `total` budget set:
    - Expected pace = `(daysElapsed / totalDays) × total`
    - Same green/yellow/red thresholds against pace
  - If both set, both bars shown
- Category breakdown: pie chart + list with amounts
- Filter by: all / by day / by category

### 5.5 Map View (Map Tab)
- Leaflet map with OpenStreetMap tiles
- Stops plotted as markers with day number labels
- Route lines between stops based on transport method:
  - **Car / Bus:** Road routing via OSRM API (solid line)
  - **Train:** Straight line with train icon (dashed line, rail style)
  - **Plane:** Great-circle arc (curved dashed line)
  - **Walk / Boat / Ferry:** Straight line with icon
  - **No transport / unconnected:** No line drawn
- Confirmed legs (booked/paid) shown in solid color
- Unconfirmed legs shown in dashed/faded style
- Partial trip support: only stops with data are plotted
- Tap marker → shows stop name, day, accommodation status

### 5.6 Packing List (Packing Tab)
- Simple checklist with check/uncheck
- Add item with optional weight (grams)
- Total weight shown at bottom (e.g. "14.2 kg total")
- Checked items shown greyed / struck through
- "Copy from previous trip" → select trip → import list unchecked, weights preserved
- Sort: manual / by weight / by checked status

### 5.7 Trip Summary Screen
- Accessible from trip header (⋯ menu)
- Shows:
  - Trip name, dates, total days, destinations visited
  - Total spend by category (bar chart)
  - Total spend vs. budget (if set)
  - Daily average spend
  - All stops on map
  - Accommodation list with booking statuses
  - Packing list completion status

### 5.8 Global Settings Screen

**Account & Sync**
- Google Sign-In / Sign-Out
- Sync status + last synced timestamp
- Sync condition: Wi-Fi only / Wi-Fi + mobile data / manual only
- Manual sync button

**Preferences**
- First day of week: Monday / Sunday

**Expense Categories**
- List of all categories with color + icon
- Add / rename / recolor / change icon / delete
- Reset to defaults

**Data Management**
- Export all data → JSON file
- Import from JSON file
- Clear all local data (with confirmation dialog)

**App**
- Theme: follows system (auto dark/light, no manual toggle)
- App version
- Install PWA prompt (if not yet installed)
- About / licenses

---

## 6. UI Language & Navigation

### 6.1 Language
- UI language: **English** (all labels, placeholders, messages)

### 6.2 Home Screen
- Trip list as the default/home screen
- Each trip card shows: emoji, name, destination, date range, day count, budget progress bar (if budget set)
- Card background uses trip's chosen color
- Tap card → open trip
- Long-press or swipe-left on card → Edit / Delete options
- Floating Action Button (FAB) "＋ New Trip" → create trip form

### 6.3 Bottom Navigation (inside a trip)
Five tabs, always visible at the bottom:

| # | Tab | Icon | Description |
|---|---|---|---|
| 1 | Plan | 📅 | Day-by-day itinerary |
| 2 | Calendar | 🗓 | Timeline & accommodation overview |
| 3 | Expenses | 💸 | Log spend & budget status |
| 4 | Map | 🗺 | Route & stops visualization |
| 5 | Packing | 🎒 | Checklist with weight |

- Trip name shown in top header with back arrow to home
- Trip-level actions (summary, edit trip, delete) accessible via ⋯ menu in top-right header
- Settings accessible from home screen header

---

## 7. Data Storage & Sync

### 7.1 Local Storage
- All data stored in IndexedDB via Dexie.js — on-device, private, works fully offline
- Data is lost if browser/app data is cleared — manual export is the safety net
- No account or internet connection required for core functionality

### 7.2 Export / Import
- Export all data or a single trip to a `.json` file — saved to device files, iCloud, Google Drive etc.
- Import from `.json` file — merge with or replace local data
- Available without Google login
- Recommended as a manual backup habit

### 7.3 Google Drive Sync (Optional)
- User can optionally sign in with a Google account to enable automatic sync
- App works fully without login — sync is strictly opt-in
- On first login: prompt user to either merge local data → Drive, or replace local with Drive data
- Google Drive API scope: `drive.file` — app only accesses files it created, not the user's full Drive

**Storage structure in Google Drive:**
```
Google Drive/
└── TripBudget/
    ├── trip_{id}.json       ← one file per trip
    ├── settings.json        ← expense categories, preferences, sync settings
    └── media/               ← reserved for future photos/documents
        └── trip_{id}/
            ├── day_{id}_photo1.jpg
            └── receipt_expense_{id}.jpg
```

**Conflict resolution:** Last-write-wins based on `updatedAt` timestamp per file.

### 7.4 Sync Behaviour
- **Triggers:** on app resume, on data save (debounced 30s), or manual
- **User setting:** Wi-Fi only / Wi-Fi + mobile data / manual only
- **Manual sync button:** always available in Settings and trip header (⋯ menu)
- **Sync status indicator** shown in app header at all times:

| Status | Indicator |
|---|---|
| Synced | ✅ Synced |
| Syncing in progress | 🔄 Syncing |
| No connection | ⚠️ Offline |
| Sync failed | 🔴 Error |

---

## 8. UI / UX Principles

- **Mobile-first**, usable on desktop
- Bottom navigation inside trips, standard back navigation
- All external links open in system browser (target="_blank")
- Booking status always visible at a glance via color badges
- Offline status indicator in header when no connection
- Exchange rate staleness warning when rates > 24h old
- Theme follows system dark/light mode preference automatically

---

## 9. Build Order (Suggested Increments)

| Step | Scope | Deliverable |
|---|---|---|
| 1 | PWA shell, Dexie setup, routing, bottom nav | Installable empty app |
| 2 | Trips list + create/edit trip | Home screen working |
| 3 | Day planner — days, stops, transport legs, accommodation | Core planning flow |
| 4 | Calendar / timeline view | Visual trip overview |
| 5 | Expense categories + expense logging | Spend tracking |
| 6 | Currency conversion + budget bar | Budget awareness |
| 7 | Packing list with weight + copy from trip | Packing feature |
| 8 | Map view — Leaflet, markers, route lines | Visual map |
| 9 | Trip summary screen | End-of-trip review |
| 10 | Global settings screen | Preferences & categories |
| 11 | Export / Import JSON | Data safety |
| 12 | Google Drive sync + OAuth2 | Cross-device sync |
| 13 | PWA polish — offline handling, install prompt, caching | Production ready |

---

## 10. External APIs

| API | Usage | Auth | Notes |
|---|---|---|---|
| Frankfurter API (`api.frankfurter.app`) | ECB exchange rates | None | Free, no key needed |
| OSRM (`router.project-osrm.org`) | Road routing for map | None | Public, fair use |
| OpenStreetMap (via Leaflet) | Map tiles | None | Tile usage policy applies |
| Google Drive API | Trip data sync, file storage | OAuth2 (drive.file scope) | Free (15GB user quota) |

---

## 11. Out of Scope (v1)

- Photo attachments
- Shared/split expenses between travelers
- PDF / CSV export
- Trip sharing via URL or link
- Weather forecast integration
- Trip templates
- Backend sync / multi-device without Google Drive (can add Supabase later)