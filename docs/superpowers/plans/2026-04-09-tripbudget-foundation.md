# TripBudget Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of TripBudget — an installable offline-first PWA with trip management and day-by-day planning (stops, transport legs, accommodation), backed by a typed Dexie repository layer.

**Architecture:** Repository layer + feature modules. All mutations go through typed repositories that own domain logic (day auto-generation, accommodation-to-day assignment, destination stop creation on transport save). Components call repositories via custom hooks; Dexie's `useLiveQuery` drives reactivity.

**Tech Stack:** React 18 + TypeScript + Vite, Ionic React (UI + tabs + modals), Dexie.js + dexie-react-hooks (IndexedDB), React Router v6, Vitest + React Testing Library + fake-indexeddb (tests), vite-plugin-pwa (Workbox), uuid

**Covers:** Build steps 1–3 from spec build order.
**Plans 2 and 3** cover steps 4–13 (Calendar, Expenses, Map, Packing, Settings, Sync, PWA polish).

---

## File Map

```
src/
├── test/
│   └── setup.ts                              # Vitest globals + jest-dom + fake-indexeddb
├── db/
│   ├── schema.ts                             # All TypeScript entity types
│   ├── db.ts                                 # Dexie singleton
│   └── repositories/
│       ├── TripRepository.ts
│       ├── DayRepository.ts
│       ├── StopRepository.ts
│       ├── TransportLegRepository.ts
│       ├── AccommodationRepository.ts
│       └── __tests__/
│           ├── TripRepository.test.ts
│           ├── DayRepository.test.ts
│           ├── StopRepository.test.ts
│           ├── TransportLegRepository.test.ts
│           └── AccommodationRepository.test.ts
├── lib/
│   ├── geocoding.ts                          # Nominatim place search
│   └── __tests__/
│       └── geocoding.test.ts
├── components/
│   ├── TripShell.tsx                         # Layout route: bottom tabs + top header
│   └── __mocks__/
│       └── ionic.tsx                         # Shared Ionic mock for component tests
├── features/
│   ├── trips/
│   │   ├── hooks/
│   │   │   └── useTrips.ts
│   │   └── components/
│   │       ├── TripsPage.tsx
│   │       ├── TripCard.tsx
│   │       ├── TripFormModal.tsx
│   │       └── __tests__/
│   │           ├── TripsPage.test.tsx
│   │           └── TripCard.test.tsx
│   └── planner/
│       ├── hooks/
│       │   ├── useDays.ts
│       │   ├── useStops.ts
│       │   ├── useTransportLegs.ts
│       │   └── useAccommodations.ts
│       └── components/
│           ├── PlannerPage.tsx
│           ├── DayCard.tsx
│           ├── StopItem.tsx
│           ├── TransportLegItem.tsx
│           ├── AccommodationBlock.tsx
│           ├── PlaceSearchModal.tsx
│           ├── StopFormModal.tsx
│           ├── TransportLegFormModal.tsx
│           ├── AccommodationFormModal.tsx
│           └── __tests__/
│               └── DayCard.test.tsx
├── App.tsx
└── main.tsx
```

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json` (via npm init)
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
npm create vite@latest tripBudgetApp -- --template react-ts
cd tripBudgetApp
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @ionic/react @ionic/react-router ionicons
npm install dexie dexie-react-hooks
npm install react-router-dom
npm install uuid
npm install -D @types/uuid
npm install -D vitest @vitest/coverage-v8 jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D fake-indexeddb
npm install -D vite-plugin-pwa
```

- [ ] **Step 3: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TripBudget',
        short_name: 'TripBudget',
        theme_color: '#3880ff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Add `"types": ["vitest/globals"]` to `tsconfig.json` compilerOptions**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Write `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
```

- [ ] **Step 6: Add test script to `package.json`**

Add to `scripts`:
```json
"test": "vitest",
"test:run": "vitest run",
"coverage": "vitest run --coverage"
```

- [ ] **Step 6b: Note on React imports**

All component files in this plan use the `React.FC` type annotation, which requires React in scope. Add `import React from 'react'` to every `.tsx` file that uses `React.FC`. Alternatively, drop the annotation entirely (`const Foo = () => ...`) — both work fine with Vite's JSX transform.

- [ ] **Step 7: Run tests to confirm setup works**

```bash
npm run test:run
```

Expected: no tests found, exits 0 (or "no test files found" message — not an error).

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffolding — Vite + React + Ionic + Dexie + Vitest"
```

---

## Task 2: Dexie schema & types

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/db.ts`

- [ ] **Step 1: Write `src/db/schema.ts`**

```typescript
export interface Link {
  label: string
  url: string
}

export interface Trip {
  id: string
  name: string
  destination: string
  emoji: string
  coverColor: string
  startDate: string        // YYYY-MM-DD
  endDate: string          // YYYY-MM-DD
  defaultCurrency: string  // ISO 4217
  budget: { total?: number; dailyAmount?: number }
  createdAt: string        // ISO datetime
  updatedAt: string        // ISO datetime
}

export interface Day {
  id: string
  tripId: string
  date: string             // YYYY-MM-DD
  dayNumber: number        // 1-based
  notes?: string
  accommodationId?: string
}

export interface Stop {
  id: string
  dayId: string
  order: number
  placeName: string
  lat?: number             // undefined = offline / not yet pinned
  lng?: number
  placeLink?: string
  usefulLinks: Link[]
}

export interface TransportLeg {
  id: string
  tripId: string
  fromStopId: string
  toStopId: string
  method: 'car' | 'bus' | 'train' | 'plane' | 'walk' | 'boat' | 'ferry'
  status: 'not_booked' | 'booked' | 'booked_paid'
  departureDateTime?: string  // ISO datetime
  arrivalDateTime?: string    // ISO datetime
  // isOvernightTransport is COMPUTED, not stored — use isOvernight() helper
  notes?: string
  bookingLink?: string
  usefulLinks: Link[]
}

export interface Accommodation {
  id: string
  tripId: string
  name: string
  link?: string
  status: 'not_booked' | 'booked' | 'booked_paid'
  checkIn: string          // YYYY-MM-DD (inclusive)
  checkOut: string         // YYYY-MM-DD (exclusive — hotel-style)
  confirmationLink?: string
  usefulLinks: Link[]
}

export interface ExpenseCategory {
  id: string
  label: string
  color: string            // hex
  icon: string
}

export interface Expense {
  id: string
  tripId: string
  dayId?: string
  categoryId: string
  amount: number
  currency: string
  amountConverted: number
  convertedAt: string
  note?: string
  date: string             // YYYY-MM-DD
}

export interface PackingItem {
  id: string
  tripId: string
  label: string
  checked: boolean
  weightGrams?: number
}

export interface ExchangeRateCache {
  base: string
  rates: Record<string, number>
  fetchedAt: string
}

export interface UserSettings {
  id: 'singleton'
  firstDayOfWeek: 'monday' | 'sunday'
  syncCondition: 'wifi' | 'wifi_and_mobile' | 'manual'
  googleConnected: boolean
  lastSyncedAt?: string
}
```

- [ ] **Step 2: Write `src/db/db.ts`**

```typescript
import Dexie, { type Table } from 'dexie'
import type {
  Trip, Day, Stop, TransportLeg, Accommodation,
  ExpenseCategory, Expense, PackingItem, ExchangeRateCache, UserSettings,
} from './schema'

class TripBudgetDB extends Dexie {
  trips!: Table<Trip>
  days!: Table<Day>
  stops!: Table<Stop>
  transportLegs!: Table<TransportLeg>
  accommodations!: Table<Accommodation>
  expenseCategories!: Table<ExpenseCategory>
  expenses!: Table<Expense>
  packingItems!: Table<PackingItem>
  exchangeRateCache!: Table<ExchangeRateCache>
  userSettings!: Table<UserSettings>

  constructor() {
    super('TripBudgetDB')
    this.version(1).stores({
      trips:             'id, createdAt',
      days:              'id, tripId, date',
      stops:             'id, dayId',
      transportLegs:     'id, tripId, fromStopId, toStopId',
      accommodations:    'id, tripId, checkIn, checkOut',
      expenseCategories: 'id',
      expenses:          'id, tripId, dayId, date',
      packingItems:      'id, tripId',
      exchangeRateCache: 'base',
      userSettings:      'id',
    })
  }
}

export const db = new TripBudgetDB()
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts src/db/db.ts
git commit -m "feat: Dexie schema and all entity types"
```

---

## Task 3: TripRepository

**Files:**
- Create: `src/db/repositories/TripRepository.ts`
- Create: `src/db/repositories/__tests__/TripRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/db/repositories/__tests__/TripRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { TripRepository } from '../TripRepository'

const BASE_TRIP = {
  name: 'Japan Trip',
  destination: 'Japan',
  emoji: '🇯🇵',
  coverColor: '#FF0000',
  startDate: '2026-05-01',
  endDate: '2026-05-03',
  defaultCurrency: 'PLN',
  budget: {},
}

beforeEach(async () => {
  await Promise.all([db.trips.clear(), db.days.clear()])
})

describe('TripRepository.create', () => {
  it('persists a trip with generated id, createdAt, updatedAt', async () => {
    const id = await TripRepository.create(BASE_TRIP)
    const saved = await db.trips.get(id)
    expect(saved).toMatchObject({ name: 'Japan Trip', id })
    expect(saved?.createdAt).toBeTruthy()
    expect(saved?.updatedAt).toBeTruthy()
  })

  it('auto-generates one Day per date in the trip range (inclusive)', async () => {
    const id = await TripRepository.create(BASE_TRIP)
    const days = await db.days.where('tripId').equals(id).sortBy('date')
    expect(days).toHaveLength(3)
    expect(days.map(d => d.date)).toEqual(['2026-05-01', '2026-05-02', '2026-05-03'])
    expect(days.map(d => d.dayNumber)).toEqual([1, 2, 3])
  })
})

describe('TripRepository.update', () => {
  it('updates fields and bumps updatedAt', async () => {
    const id = await TripRepository.create(BASE_TRIP)
    const before = (await db.trips.get(id))!.updatedAt
    await new Promise(r => setTimeout(r, 5))
    await TripRepository.update({ id, name: 'Korea Trip' })
    const saved = await db.trips.get(id)
    expect(saved?.name).toBe('Korea Trip')
    expect(saved?.updatedAt).not.toBe(before)
  })
})

describe('TripRepository.delete', () => {
  it('removes the trip and all its days', async () => {
    const id = await TripRepository.create(BASE_TRIP)
    await TripRepository.delete(id)
    expect(await db.trips.get(id)).toBeUndefined()
    const days = await db.days.where('tripId').equals(id).toArray()
    expect(days).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- TripRepository
```

Expected: FAIL — `TripRepository` not found.

- [ ] **Step 3: Write `src/db/repositories/TripRepository.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Trip } from '../schema'
import { DayRepository } from './DayRepository'

type TripInput = Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>
type TripUpdate = Partial<TripInput> & { id: string }

export const TripRepository = {
  useAll() {
    return useLiveQuery(() => db.trips.orderBy('createdAt').reverse().toArray(), [])
  },

  useById(id: string) {
    return useLiveQuery(() => db.trips.get(id), [id])
  },

  async create(input: TripInput): Promise<string> {
    const now = new Date().toISOString()
    const id = uuidv4()
    await db.trips.add({ ...input, id, createdAt: now, updatedAt: now })
    await DayRepository.generateForTrip(id, input.startDate, input.endDate)
    return id
  },

  async update(input: TripUpdate): Promise<void> {
    const { id, ...rest } = input
    const now = new Date().toISOString()
    await db.trips.update(id, { ...rest, updatedAt: now })
    if (rest.startDate !== undefined || rest.endDate !== undefined) {
      const trip = await db.trips.get(id)
      if (trip) {
        await DayRepository.regenerateForTrip(id, trip.startDate, trip.endDate)
      }
    }
  },

  async delete(id: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.trips, db.days, db.stops, db.transportLegs, db.accommodations, db.expenses, db.packingItems],
      async () => {
        const days = await db.days.where('tripId').equals(id).toArray()
        const dayIds = days.map(d => d.id)
        if (dayIds.length) await db.stops.where('dayId').anyOf(dayIds).delete()
        await db.days.where('tripId').equals(id).delete()
        await db.transportLegs.where('tripId').equals(id).delete()
        await db.accommodations.where('tripId').equals(id).delete()
        await db.expenses.where('tripId').equals(id).delete()
        await db.packingItems.where('tripId').equals(id).delete()
        await db.trips.delete(id)
      }
    )
  },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- TripRepository
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/TripRepository.ts src/db/repositories/__tests__/TripRepository.test.ts
git commit -m "feat: TripRepository with auto-day generation and cascade delete"
```

---

## Task 4: DayRepository

**Files:**
- Create: `src/db/repositories/DayRepository.ts`
- Create: `src/db/repositories/__tests__/DayRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/db/repositories/__tests__/DayRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { DayRepository } from '../DayRepository'

beforeEach(async () => {
  await Promise.all([db.days.clear()])
})

describe('DayRepository.generateForTrip', () => {
  it('creates sequential numbered days for each date inclusive', async () => {
    await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-03')
    const days = await db.days.where('tripId').equals('trip1').sortBy('date')
    expect(days).toHaveLength(3)
    expect(days[0]).toMatchObject({ date: '2026-06-01', dayNumber: 1, tripId: 'trip1' })
    expect(days[2]).toMatchObject({ date: '2026-06-03', dayNumber: 3 })
  })
})

describe('DayRepository.regenerateForTrip', () => {
  it('removes days outside new range and adds missing ones', async () => {
    await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-04')
    await DayRepository.regenerateForTrip('trip1', '2026-06-02', '2026-06-05')
    const days = await db.days.where('tripId').equals('trip1').sortBy('date')
    const dates = days.map(d => d.date)
    expect(dates).not.toContain('2026-06-01')
    expect(dates).toContain('2026-06-05')
    expect(days.map(d => d.dayNumber)).toEqual([1, 2, 3, 4])
  })

  it('preserves notes on retained days', async () => {
    await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-03')
    const day = (await db.days.where('tripId').equals('trip1').filter(d => d.date === '2026-06-02').first())!
    await db.days.update(day.id, { notes: 'Visit temple' })
    await DayRepository.regenerateForTrip('trip1', '2026-06-01', '2026-06-04')
    const retained = await db.days.get(day.id)
    expect(retained?.notes).toBe('Visit temple')
  })
})

describe('DayRepository.updateNotes', () => {
  it('sets notes on the day', async () => {
    await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-01')
    const day = (await db.days.where('tripId').equals('trip1').first())!
    await DayRepository.updateNotes(day.id, 'Arrival day')
    const updated = await db.days.get(day.id)
    expect(updated?.notes).toBe('Arrival day')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- DayRepository
```

Expected: FAIL — `DayRepository` not found.

- [ ] **Step 3: Write `src/db/repositories/DayRepository.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Day } from '../schema'

/** Timezone-safe: always works in UTC to avoid DST shifts */
function datesBetweenInclusive(start: string, end: string): string[] {
  const dates: string[] = []
  let current = start
  while (current <= end) {
    dates.push(current)
    const d = new Date(current + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    current = d.toISOString().slice(0, 10)
  }
  return dates
}

export const DayRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.days.where('tripId').equals(tripId).sortBy('date'),
      [tripId]
    )
  },

  async generateForTrip(tripId: string, startDate: string, endDate: string): Promise<void> {
    const dates = datesBetweenInclusive(startDate, endDate)
    const days: Day[] = dates.map((date, i) => ({
      id: uuidv4(),
      tripId,
      date,
      dayNumber: i + 1,
      usefulLinks: [],
    }))
    await db.days.bulkAdd(days)
  },

  async regenerateForTrip(tripId: string, startDate: string, endDate: string): Promise<void> {
    const targetDates = new Set(datesBetweenInclusive(startDate, endDate))
    const existing = await db.days.where('tripId').equals(tripId).toArray()
    const existingByDate = new Map(existing.map(d => [d.date, d]))

    // Delete days outside new range
    const toDelete = existing.filter(d => !targetDates.has(d.date)).map(d => d.id)
    if (toDelete.length) await db.days.bulkDelete(toDelete)

    // Add missing days (placeholder dayNumber; renumbered below)
    const toAdd: Day[] = [...targetDates]
      .filter(date => !existingByDate.has(date))
      .map(date => ({ id: uuidv4(), tripId, date, dayNumber: 0, usefulLinks: [] }))
    if (toAdd.length) await db.days.bulkAdd(toAdd)

    // Renumber all remaining days in date order
    const allDays = await db.days.where('tripId').equals(tripId).sortBy('date')
    await Promise.all(allDays.map((d, i) => db.days.update(d.id, { dayNumber: i + 1 })))
  },

  async updateNotes(id: string, notes: string): Promise<void> {
    await db.days.update(id, { notes })
  },

  async setAccommodation(id: string, accommodationId: string | undefined): Promise<void> {
    await db.days.update(id, { accommodationId })
  },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- DayRepository
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/DayRepository.ts src/db/repositories/__tests__/DayRepository.test.ts
git commit -m "feat: DayRepository with timezone-safe date generation and regeneration"
```

---

## Task 5: StopRepository

**Files:**
- Create: `src/db/repositories/StopRepository.ts`
- Create: `src/db/repositories/__tests__/StopRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/db/repositories/__tests__/StopRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { StopRepository } from '../StopRepository'

beforeEach(async () => { await db.stops.clear() })

const BASE_STOP = {
  dayId: 'day1',
  order: 0,
  placeName: 'Shinjuku Station',
  lat: 35.6896,
  lng: 139.7006,
  usefulLinks: [],
}

describe('StopRepository.create', () => {
  it('persists stop with generated id', async () => {
    const id = await StopRepository.create(BASE_STOP)
    const saved = await db.stops.get(id)
    expect(saved).toMatchObject({ placeName: 'Shinjuku Station', dayId: 'day1' })
  })

  it('allows stop with no coordinates (offline entry)', async () => {
    const id = await StopRepository.create({ ...BASE_STOP, lat: undefined, lng: undefined })
    const saved = await db.stops.get(id)
    expect(saved?.lat).toBeUndefined()
    expect(saved?.lng).toBeUndefined()
  })
})

describe('StopRepository.reorder', () => {
  it('assigns order by position in given array', async () => {
    const id1 = await StopRepository.create({ ...BASE_STOP, order: 0 })
    const id2 = await StopRepository.create({ ...BASE_STOP, order: 1 })
    await StopRepository.reorder('day1', [id2, id1])
    expect((await db.stops.get(id2))?.order).toBe(0)
    expect((await db.stops.get(id1))?.order).toBe(1)
  })
})

describe('StopRepository.delete', () => {
  it('removes the stop', async () => {
    const id = await StopRepository.create(BASE_STOP)
    await StopRepository.delete(id)
    expect(await db.stops.get(id)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- StopRepository
```

Expected: FAIL — `StopRepository` not found.

- [ ] **Step 3: Write `src/db/repositories/StopRepository.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Stop } from '../schema'

type StopInput = Omit<Stop, 'id'>

export const StopRepository = {
  useByDayId(dayId: string) {
    return useLiveQuery(
      () => db.stops.where('dayId').equals(dayId).sortBy('order'),
      [dayId]
    )
  },

  async getByDayId(dayId: string): Promise<Stop[]> {
    return db.stops.where('dayId').equals(dayId).sortBy('order')
  },

  async create(input: StopInput): Promise<string> {
    const id = uuidv4()
    await db.stops.add({ ...input, id })
    return id
  },

  async update(id: string, updates: Partial<Omit<Stop, 'id'>>): Promise<void> {
    await db.stops.update(id, updates)
  },

  async delete(id: string): Promise<void> {
    await db.stops.delete(id)
  },

  async reorder(dayId: string, orderedIds: string[]): Promise<void> {
    await Promise.all(orderedIds.map((id, index) => db.stops.update(id, { order: index })))
  },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- StopRepository
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/StopRepository.ts src/db/repositories/__tests__/StopRepository.test.ts
git commit -m "feat: StopRepository with optional coordinates (offline support)"
```

---

## Task 6: Geocoding lib

**Files:**
- Create: `src/lib/geocoding.ts`
- Create: `src/lib/__tests__/geocoding.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/geocoding.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { searchPlaces } from '../geocoding'

beforeEach(() => { vi.restoreAllMocks() })

describe('searchPlaces', () => {
  it('maps Nominatim response to PlaceResult array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { display_name: 'Shinjuku, Tokyo, Japan', lat: '35.6896', lon: '139.7006' },
      ],
    }))

    const results = await searchPlaces('Shinjuku')
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      displayName: 'Shinjuku, Tokyo, Japan',
      lat: 35.6896,
      lng: 139.7006,
    })
  })

  it('throws when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(searchPlaces('nowhere')).rejects.toThrow('Nominatim search failed')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- geocoding
```

Expected: FAIL — `geocoding` not found.

- [ ] **Step 3: Write `src/lib/geocoding.ts`**

```typescript
export interface PlaceResult {
  displayName: string
  lat: number
  lng: number
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'TripBudgetApp/1.0 (contact@example.com)',
    },
  })
  if (!response.ok) throw new Error('Nominatim search failed')
  const data: Array<{ display_name: string; lat: string; lon: string }> = await response.json()
  return data.map(item => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }))
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- geocoding
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geocoding.ts src/lib/__tests__/geocoding.test.ts
git commit -m "feat: Nominatim geocoding lib with typed PlaceResult"
```

---

## Task 7: TransportLegRepository

**Files:**
- Create: `src/db/repositories/TransportLegRepository.ts`
- Create: `src/db/repositories/__tests__/TransportLegRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/db/repositories/__tests__/TransportLegRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { TransportLegRepository, isOvernightTransport } from '../TransportLegRepository'
import { DayRepository } from '../DayRepository'
import { StopRepository } from '../StopRepository'

beforeEach(async () => {
  await Promise.all([db.trips.clear(), db.days.clear(), db.stops.clear(), db.transportLegs.clear()])
  // Seed: trip + days + origin stop
  await db.trips.add({
    id: 'trip1', name: 'T', destination: 'D', emoji: '🌍', coverColor: '#fff',
    startDate: '2026-06-01', endDate: '2026-06-03',
    defaultCurrency: 'EUR', budget: {}, createdAt: '', updatedAt: '',
  })
  await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-03')
  const day1 = (await db.days.where('tripId').equals('trip1').filter(d => d.date === '2026-06-01').first())!
  await db.stops.add({ id: 'stop1', dayId: day1.id, order: 0, placeName: 'Paris', usefulLinks: [] })
})

describe('isOvernightTransport', () => {
  it('returns true when arrival date is after departure date', () => {
    const leg = { departureDateTime: '2026-06-01T22:00:00', arrivalDateTime: '2026-06-02T06:00:00' }
    expect(isOvernightTransport(leg as any)).toBe(true)
  })

  it('returns false when same day', () => {
    const leg = { departureDateTime: '2026-06-01T10:00:00', arrivalDateTime: '2026-06-01T14:00:00' }
    expect(isOvernightTransport(leg as any)).toBe(false)
  })
})

describe('TransportLegRepository.create', () => {
  it('creates leg and destination stop on arrival day', async () => {
    const legId = await TransportLegRepository.create({
      tripId: 'trip1',
      fromStopId: 'stop1',
      method: 'train',
      status: 'not_booked',
      departureDateTime: '2026-06-01T22:00:00',
      arrivalDateTime: '2026-06-02T06:00:00',
      destinationName: 'Amsterdam Centraal',
    })

    const leg = await db.transportLegs.get(legId)
    expect(leg).toBeTruthy()
    expect(leg?.fromStopId).toBe('stop1')

    const destStop = await db.stops.get(leg!.toStopId)
    expect(destStop?.placeName).toBe('Amsterdam Centraal')

    const day2 = (await db.days.where('tripId').equals('trip1').filter(d => d.date === '2026-06-02').first())!
    expect(destStop?.dayId).toBe(day2.id)
  })

  it('extends trip endDate when arrival is after trip end', async () => {
    await TransportLegRepository.create({
      tripId: 'trip1',
      fromStopId: 'stop1',
      method: 'plane',
      status: 'not_booked',
      departureDateTime: '2026-06-03T23:00:00',
      arrivalDateTime: '2026-06-05T08:00:00',
      destinationName: 'Tokyo',
    })

    const trip = await db.trips.get('trip1')
    expect(trip?.endDate).toBe('2026-06-05')
    const day5 = await db.days.where('tripId').equals('trip1').filter(d => d.date === '2026-06-05').first()
    expect(day5).toBeTruthy()
  })
})

describe('TransportLegRepository.delete', () => {
  it('removes leg and its destination stop', async () => {
    const legId = await TransportLegRepository.create({
      tripId: 'trip1', fromStopId: 'stop1', method: 'bus',
      status: 'not_booked', arrivalDateTime: '2026-06-02T10:00:00', destinationName: 'Lyon',
    })
    const leg = (await db.transportLegs.get(legId))!
    const toStopId = leg.toStopId
    await TransportLegRepository.delete(legId)
    expect(await db.transportLegs.get(legId)).toBeUndefined()
    expect(await db.stops.get(toStopId)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- TransportLegRepository
```

Expected: FAIL — `TransportLegRepository` not found.

- [ ] **Step 3: Write `src/db/repositories/TransportLegRepository.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { TransportLeg } from '../schema'
import { DayRepository } from './DayRepository'
import { StopRepository } from './StopRepository'

export function isOvernightTransport(leg: Pick<TransportLeg, 'departureDateTime' | 'arrivalDateTime'>): boolean {
  if (!leg.departureDateTime || !leg.arrivalDateTime) return false
  return leg.arrivalDateTime.slice(0, 10) > leg.departureDateTime.slice(0, 10)
}

type CreateInput = {
  tripId: string
  fromStopId: string
  method: TransportLeg['method']
  status: TransportLeg['status']
  departureDateTime?: string
  arrivalDateTime?: string
  destinationName: string
  destinationLat?: number
  destinationLng?: number
  notes?: string
  bookingLink?: string
  usefulLinks?: TransportLeg['usefulLinks']
}

type UpdateInput = {
  id: string
  method?: TransportLeg['method']
  status?: TransportLeg['status']
  departureDateTime?: string
  arrivalDateTime?: string
  destinationName?: string
  destinationLat?: number
  destinationLng?: number
  notes?: string
  bookingLink?: string
  usefulLinks?: TransportLeg['usefulLinks']
}

async function findOrCreateArrivalDay(tripId: string, arrivalDateTime: string): Promise<string> {
  const arrivalDate = arrivalDateTime.slice(0, 10)
  let day = await db.days.where('tripId').equals(tripId).filter(d => d.date === arrivalDate).first()
  if (!day) {
    const trip = await db.trips.get(tripId)
    if (!trip) throw new Error(`Trip ${tripId} not found`)
    if (arrivalDate > trip.endDate) {
      await db.trips.update(tripId, { endDate: arrivalDate, updatedAt: new Date().toISOString() })
      await DayRepository.regenerateForTrip(tripId, trip.startDate, arrivalDate)
    }
    day = await db.days.where('tripId').equals(tripId).filter(d => d.date === arrivalDate).first()
  }
  if (!day) throw new Error(`Could not find or create day for ${arrivalDate}`)
  return day.id
}

export const TransportLegRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.transportLegs.where('tripId').equals(tripId).toArray(),
      [tripId]
    )
  },

  async create(input: CreateInput): Promise<string> {
    const { tripId, fromStopId, destinationName, destinationLat, destinationLng, arrivalDateTime, ...rest } = input

    let destDayId: string
    if (arrivalDateTime) {
      destDayId = await findOrCreateArrivalDay(tripId, arrivalDateTime)
    } else {
      const fromStop = await db.stops.get(fromStopId)
      if (!fromStop) throw new Error(`Stop ${fromStopId} not found`)
      destDayId = fromStop.dayId
    }

    const existingStops = await StopRepository.getByDayId(destDayId)
    const toStopId = await StopRepository.create({
      dayId: destDayId,
      order: existingStops.length,
      placeName: destinationName,
      lat: destinationLat,
      lng: destinationLng,
      usefulLinks: [],
    })

    const id = uuidv4()
    await db.transportLegs.add({
      id, tripId, fromStopId, toStopId, arrivalDateTime, usefulLinks: [], ...rest,
    })
    return id
  },

  async update(input: UpdateInput): Promise<void> {
    const { id, arrivalDateTime, destinationName, destinationLat, destinationLng, ...rest } = input
    const leg = await db.transportLegs.get(id)
    if (!leg) throw new Error(`TransportLeg ${id} not found`)

    if (arrivalDateTime !== undefined && arrivalDateTime !== leg.arrivalDateTime) {
      const newDayId = await findOrCreateArrivalDay(leg.tripId, arrivalDateTime)
      await db.stops.update(leg.toStopId, { dayId: newDayId })
    }

    if (destinationName !== undefined) await db.stops.update(leg.toStopId, { placeName: destinationName })
    if (destinationLat !== undefined) await db.stops.update(leg.toStopId, { lat: destinationLat, lng: destinationLng })

    await db.transportLegs.update(id, {
      ...rest,
      ...(arrivalDateTime !== undefined && { arrivalDateTime }),
    })
  },

  async delete(id: string): Promise<void> {
    const leg = await db.transportLegs.get(id)
    if (leg) await db.stops.delete(leg.toStopId)
    await db.transportLegs.delete(id)
  },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- TransportLegRepository
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/TransportLegRepository.ts src/db/repositories/__tests__/TransportLegRepository.test.ts
git commit -m "feat: TransportLegRepository — creates destination stop, extends trip on late arrival"
```

---

## Task 8: AccommodationRepository

**Files:**
- Create: `src/db/repositories/AccommodationRepository.ts`
- Create: `src/db/repositories/__tests__/AccommodationRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/db/repositories/__tests__/AccommodationRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { AccommodationRepository } from '../AccommodationRepository'
import { DayRepository } from '../DayRepository'

beforeEach(async () => {
  await Promise.all([db.days.clear(), db.accommodations.clear()])
  await DayRepository.generateForTrip('trip1', '2026-07-01', '2026-07-05')
})

describe('AccommodationRepository.create', () => {
  it('assigns accommodationId to days within checkIn–checkOut range (exclusive checkOut)', async () => {
    const id = await AccommodationRepository.create({
      tripId: 'trip1', name: 'Hotel A', status: 'booked',
      checkIn: '2026-07-02', checkOut: '2026-07-04', usefulLinks: [],
    })
    const days = await db.days.where('tripId').equals('trip1').sortBy('date')
    expect(days.find(d => d.date === '2026-07-01')?.accommodationId).toBeUndefined()
    expect(days.find(d => d.date === '2026-07-02')?.accommodationId).toBe(id)
    expect(days.find(d => d.date === '2026-07-03')?.accommodationId).toBe(id)
    expect(days.find(d => d.date === '2026-07-04')?.accommodationId).toBeUndefined() // exclusive
    expect(days.find(d => d.date === '2026-07-05')?.accommodationId).toBeUndefined()
  })
})

describe('AccommodationRepository.update', () => {
  it('re-assigns days when dates change', async () => {
    const id = await AccommodationRepository.create({
      tripId: 'trip1', name: 'Hotel A', status: 'booked',
      checkIn: '2026-07-01', checkOut: '2026-07-03', usefulLinks: [],
    })
    await AccommodationRepository.update(id, { checkIn: '2026-07-03', checkOut: '2026-07-05' })
    const days = await db.days.where('tripId').equals('trip1').sortBy('date')
    expect(days.find(d => d.date === '2026-07-01')?.accommodationId).toBeUndefined()
    expect(days.find(d => d.date === '2026-07-03')?.accommodationId).toBe(id)
    expect(days.find(d => d.date === '2026-07-04')?.accommodationId).toBe(id)
  })
})

describe('AccommodationRepository.delete', () => {
  it('clears accommodationId from all days before deleting', async () => {
    const id = await AccommodationRepository.create({
      tripId: 'trip1', name: 'Hotel A', status: 'booked',
      checkIn: '2026-07-01', checkOut: '2026-07-03', usefulLinks: [],
    })
    await AccommodationRepository.delete(id)
    expect(await db.accommodations.get(id)).toBeUndefined()
    const days = await db.days.where('tripId').equals('trip1').toArray()
    expect(days.every(d => d.accommodationId === undefined)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- AccommodationRepository
```

Expected: FAIL — `AccommodationRepository` not found.

- [ ] **Step 3: Write `src/db/repositories/AccommodationRepository.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Accommodation } from '../schema'

type AccommodationInput = Omit<Accommodation, 'id'>

/** Returns all dates from checkIn up to (but not including) checkOut */
function occupiedDates(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  let current = checkIn
  while (current < checkOut) {
    dates.push(current)
    const d = new Date(current + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    current = d.toISOString().slice(0, 10)
  }
  return dates
}

async function assignToDays(tripId: string, accommodationId: string, checkIn: string, checkOut: string): Promise<void> {
  const dates = new Set(occupiedDates(checkIn, checkOut))
  const days = await db.days.where('tripId').equals(tripId).filter(d => dates.has(d.date)).toArray()
  await Promise.all(days.map(d => db.days.update(d.id, { accommodationId })))
}

async function unassignFromDays(tripId: string, accommodationId: string): Promise<void> {
  const days = await db.days.where('tripId').equals(tripId)
    .filter(d => d.accommodationId === accommodationId).toArray()
  await Promise.all(days.map(d => db.days.update(d.id, { accommodationId: undefined })))
}

export const AccommodationRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.accommodations.where('tripId').equals(tripId).sortBy('checkIn'),
      [tripId]
    )
  },

  async create(input: AccommodationInput): Promise<string> {
    const id = uuidv4()
    await db.accommodations.add({ ...input, id })
    await assignToDays(input.tripId, id, input.checkIn, input.checkOut)
    return id
  },

  async update(id: string, updates: Partial<Omit<Accommodation, 'id' | 'tripId'>>): Promise<void> {
    const existing = await db.accommodations.get(id)
    if (!existing) throw new Error(`Accommodation ${id} not found`)
    if (updates.checkIn !== undefined || updates.checkOut !== undefined) {
      await unassignFromDays(existing.tripId, id)
    }
    await db.accommodations.update(id, updates)
    if (updates.checkIn !== undefined || updates.checkOut !== undefined) {
      const updated = (await db.accommodations.get(id))!
      await assignToDays(existing.tripId, id, updated.checkIn, updated.checkOut)
    }
  },

  async delete(id: string): Promise<void> {
    const existing = await db.accommodations.get(id)
    if (existing) await unassignFromDays(existing.tripId, id)
    await db.accommodations.delete(id)
  },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- AccommodationRepository
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Run all repository tests together**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db/repositories/AccommodationRepository.ts src/db/repositories/__tests__/AccommodationRepository.test.ts
git commit -m "feat: AccommodationRepository — auto-assigns checkIn/checkOut range to days"
```

---

## Task 9: App shell & routing

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/components/TripShell.tsx`

- [ ] **Step 1: Write `src/main.tsx`**

```typescript
import React from 'react'
import { createRoot } from 'react-dom/client'
import { IonApp, setupIonicReact } from '@ionic/react'
import App from './App'

/* Ionic CSS — order matters */
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'

setupIonicReact()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IonApp>
      <App />
    </IonApp>
  </React.StrictMode>
)
```

- [ ] **Step 2: Write `src/App.tsx`**

```typescript
import { IonReactRouter } from '@ionic/react-router'
import { IonRouterOutlet } from '@ionic/react'
import { Redirect, Route } from 'react-router-dom'
import TripsPage from './features/trips/components/TripsPage'
import TripShell from './components/TripShell'
import SettingsPage from './features/settings/components/SettingsPage'

const App: React.FC = () => (
  <IonReactRouter>
    <IonRouterOutlet>
      <Route exact path="/" component={TripsPage} />
      <Route path="/trips/:tripId" component={TripShell} />
      <Route exact path="/settings" component={SettingsPage} />
      <Redirect exact from="/" to="/" />
    </IonRouterOutlet>
  </IonReactRouter>
)

export default App
```

- [ ] **Step 3: Create placeholder `SettingsPage` so routing doesn't break**

```typescript
// src/features/settings/components/SettingsPage.tsx
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react'
const SettingsPage: React.FC = () => (
  <IonPage>
    <IonHeader><IonToolbar><IonTitle>Settings</IonTitle></IonToolbar></IonHeader>
    <IonContent />
  </IonPage>
)
export default SettingsPage
```

- [ ] **Step 4: Write `src/components/TripShell.tsx`**

```typescript
import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react'
import { calendarOutline, cashOutline, mapOutline, bagHandleOutline, listOutline } from 'ionicons/icons'
import { Redirect, Route, useRouteMatch } from 'react-router-dom'
import PlannerPage from '../features/planner/components/PlannerPage'

// Placeholders for tabs built in Plan 2
const CalendarPage: React.FC = () => <div>Calendar</div>
const ExpensesPage: React.FC = () => <div>Expenses</div>
const MapPage: React.FC = () => <div>Map</div>
const PackingPage: React.FC = () => <div>Packing</div>

const TripShell: React.FC = () => {
  const { url, params } = useRouteMatch<{ tripId: string }>()
  const { tripId } = params

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path={`${url}/plan`} component={PlannerPage} />
        <Route exact path={`${url}/calendar`} component={CalendarPage} />
        <Route exact path={`${url}/expenses`} component={ExpensesPage} />
        <Route exact path={`${url}/map`} component={MapPage} />
        <Route exact path={`${url}/packing`} component={PackingPage} />
        <Redirect exact from={url} to={`${url}/plan`} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="plan" href={`/trips/${tripId}/plan`}>
          <IonIcon icon={listOutline} />
          <IonLabel>Plan</IonLabel>
        </IonTabButton>
        <IonTabButton tab="calendar" href={`/trips/${tripId}/calendar`}>
          <IonIcon icon={calendarOutline} />
          <IonLabel>Calendar</IonLabel>
        </IonTabButton>
        <IonTabButton tab="expenses" href={`/trips/${tripId}/expenses`}>
          <IonIcon icon={cashOutline} />
          <IonLabel>Expenses</IonLabel>
        </IonTabButton>
        <IonTabButton tab="map" href={`/trips/${tripId}/map`}>
          <IonIcon icon={mapOutline} />
          <IonLabel>Map</IonLabel>
        </IonTabButton>
        <IonTabButton tab="packing" href={`/trips/${tripId}/packing`}>
          <IonIcon icon={bagHandleOutline} />
          <IonLabel>Packing</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  )
}

export default TripShell
```

- [ ] **Step 5: Start dev server and verify tabs render**

```bash
npm run dev
```

Open browser → navigate to `/` — should show a blank page without errors. Open console — should be error-free (TypeScript compilation clean).

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx src/App.tsx src/components/TripShell.tsx src/features/settings/
git commit -m "feat: app shell with Ionic routing and 5-tab trip navigation"
```

---

## Task 10: Shared Ionic mock

**Files:**
- Create: `src/components/__mocks__/ionic.tsx`

Component tests in jsdom can't render Ionic web components. This shared mock replaces them with plain HTML equivalents so React Testing Library can query by text/role.

- [ ] **Step 1: Write `src/components/__mocks__/ionic.tsx`**

```typescript
// src/components/__mocks__/ionic.tsx
// Shared vi.mock factory — import in any test file:
// vi.mock('@ionic/react', () => ionicMock)

export const ionicMock = {
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: any) => <div>{children}</div>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonTitle: ({ children }: any) => <h1>{children}</h1>,
  IonContent: ({ children }: any) => <main>{children}</main>,
  IonList: ({ children }: any) => <ul>{children}</ul>,
  IonItem: ({ children, onClick }: any) => <li onClick={onClick}>{children}</li>,
  IonLabel: ({ children }: any) => <span>{children}</span>,
  IonButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  IonButtons: ({ children }: any) => <div>{children}</div>,
  IonFab: ({ children }: any) => <div>{children}</div>,
  IonFabButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  IonIcon: () => <span />,
  IonModal: ({ isOpen, children }: any) => isOpen ? <div role="dialog">{children}</div> : null,
  IonInput: ({ value, onIonInput, placeholder }: any) => (
    <input
      value={value ?? ''}
      onChange={e => onIonInput?.({ detail: { value: e.target.value } })}
      placeholder={placeholder}
    />
  ),
  IonTextarea: ({ value, onIonInput, placeholder }: any) => (
    <textarea
      value={value ?? ''}
      onChange={e => onIonInput?.({ detail: { value: e.target.value } })}
      placeholder={placeholder}
    />
  ),
  IonSelect: ({ value, onIonChange, children }: any) => (
    <select value={value ?? ''} onChange={e => onIonChange?.({ detail: { value: e.target.value } })}>
      {children}
    </select>
  ),
  IonSelectOption: ({ value, children }: any) => <option value={value}>{children}</option>,
  IonCheckbox: ({ checked, onIonChange }: any) => (
    <input type="checkbox" checked={checked ?? false} onChange={e => onIonChange?.({ detail: { checked: e.target.checked } })} />
  ),
  IonSpinner: () => <span data-testid="spinner" />,
  IonBadge: ({ children }: any) => <span>{children}</span>,
  IonChip: ({ children }: any) => <span>{children}</span>,
  IonSearchbar: ({ value, onIonInput, placeholder }: any) => (
    <input
      value={value ?? ''}
      onChange={e => onIonInput?.({ detail: { value: e.target.value } })}
      placeholder={placeholder}
    />
  ),
  useIonAlert: () => [vi.fn()],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/__mocks__/ionic.tsx
git commit -m "test: shared Ionic mock for jsdom component tests"
```

---

## Task 11: Trips list page

**Files:**
- Create: `src/features/trips/hooks/useTrips.ts`
- Create: `src/features/trips/components/TripsPage.tsx`
- Create: `src/features/trips/components/__tests__/TripsPage.test.tsx`

- [ ] **Step 1: Write `src/features/trips/hooks/useTrips.ts`**

```typescript
import { TripRepository } from '../../../db/repositories/TripRepository'

export function useTrips() {
  const trips = TripRepository.useAll()
  return { trips: trips ?? [] }
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/features/trips/components/__tests__/TripsPage.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import { db } from '../../../../db/db'
import TripsPage from '../TripsPage'

vi.mock('@ionic/react', () => ionicMock)
vi.mock('@ionic/react-router', () => ({ IonReactRouter: ({ children }: any) => children }))

beforeEach(async () => { await db.trips.clear() })

describe('TripsPage', () => {
  it('renders page title', () => {
    render(<MemoryRouter><TripsPage /></MemoryRouter>)
    expect(screen.getByText('My Trips')).toBeInTheDocument()
  })

  it('shows empty state when no trips exist', () => {
    render(<MemoryRouter><TripsPage /></MemoryRouter>)
    expect(screen.getByText(/no trips yet/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npm run test:run -- TripsPage
```

Expected: FAIL — `TripsPage` not found.

- [ ] **Step 4: Write `src/features/trips/components/TripsPage.tsx`**

```typescript
import {
  IonContent, IonFab, IonFabButton, IonHeader, IonIcon,
  IonPage, IonTitle, IonToolbar, IonButtons, IonButton,
} from '@ionic/react'
import { add, settingsOutline } from 'ionicons/icons'
import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useTrips } from '../hooks/useTrips'
import TripCard from './TripCard'
import TripFormModal from './TripFormModal'

const TripsPage: React.FC = () => {
  const { trips } = useTrips()
  const [showForm, setShowForm] = useState(false)
  const history = useHistory()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Trips</IonTitle>
          <IonButtons slot="end">
            <IonButton routerLink="/settings">
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {trips.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--ion-color-medium)' }}>
            No trips yet — tap + to create one
          </p>
        )}
        {trips.map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
            onClick={() => history.push(`/trips/${trip.id}/plan`)}
          />
        ))}
      </IonContent>

      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => setShowForm(true)}>
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

      <TripFormModal isOpen={showForm} onDismiss={() => setShowForm(false)} />
    </IonPage>
  )
}

export default TripsPage
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
npm run test:run -- TripsPage
```

Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/trips/
git commit -m "feat: trips list page with empty state"
```

---

## Task 12: Trip card component

**Files:**
- Create: `src/features/trips/components/TripCard.tsx`
- Create: `src/features/trips/components/__tests__/TripCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/trips/components/__tests__/TripCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import TripCard from '../TripCard'
import type { Trip } from '../../../../db/schema'

vi.mock('@ionic/react', () => ionicMock)

const TRIP: Trip = {
  id: 'trip1', name: 'Japan', destination: 'Tokyo', emoji: '🇯🇵',
  coverColor: '#e8f4e8', startDate: '2026-05-01', endDate: '2026-05-07',
  defaultCurrency: 'PLN', budget: {}, createdAt: '', updatedAt: '',
}

describe('TripCard', () => {
  it('renders trip name, destination, and dates', () => {
    render(<TripCard trip={TRIP} onClick={vi.fn()} />)
    expect(screen.getByText('Japan')).toBeInTheDocument()
    expect(screen.getByText(/Tokyo/)).toBeInTheDocument()
  })

  it('calls onClick when tapped', () => {
    const onClick = vi.fn()
    render(<TripCard trip={TRIP} onClick={onClick} />)
    fireEvent.click(screen.getByText('Japan'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- TripCard
```

Expected: FAIL — `TripCard` not found.

- [ ] **Step 3: Write `src/features/trips/components/TripCard.tsx`**

```typescript
import type { Trip } from '../../../db/schema'

interface Props {
  trip: Trip
  onClick: () => void
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric' })
  const days = Math.round((new Date(end + 'T00:00:00Z').getTime() - new Date(start + 'T00:00:00Z').getTime()) / 86400000) + 1
  return `${fmt(start)} – ${fmt(end)} · ${days}d`
}

const TripCard: React.FC<Props> = ({ trip, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: trip.coverColor,
      borderRadius: 12,
      padding: '1rem',
      margin: '0.75rem 1rem',
      cursor: 'pointer',
    }}
  >
    <div style={{ fontSize: '2rem' }}>{trip.emoji}</div>
    <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: 600 }}>{trip.name}</h2>
    <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', opacity: 0.7 }}>{trip.destination}</p>
    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>{formatDateRange(trip.startDate, trip.endDate)}</p>
    {(trip.budget.total || trip.budget.dailyAmount) && (
      <div style={{ marginTop: '0.5rem', height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2 }}>
        <div style={{ width: '40%', height: '100%', background: 'var(--ion-color-success)', borderRadius: 2 }} />
      </div>
    )}
  </div>
)

export default TripCard
```

Note: the budget progress bar width is a placeholder — it will use real expense data once the Expenses feature is built in Plan 2.

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm run test:run -- TripCard
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/trips/components/TripCard.tsx src/features/trips/components/__tests__/TripCard.test.tsx
git commit -m "feat: TripCard with date range, emoji, and budget bar placeholder"
```

---

## Task 13: Trip form modal

**Files:**
- Create: `src/features/trips/components/TripFormModal.tsx`

This modal handles both create and edit. When `trip` prop is provided, it's edit mode.

- [ ] **Step 1: Write `src/features/trips/components/TripFormModal.tsx`**

```typescript
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonInput, IonItem, IonLabel, IonSelect, IonSelectOption,
} from '@ionic/react'
import { useState } from 'react'
import { TripRepository } from '../../../db/repositories/TripRepository'
import type { Trip } from '../../../db/schema'

const COLORS = ['#e8f4e8', '#fef3cd', '#d1ecf1', '#f8d7da', '#e2e3e5', '#d4edda']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CHF', 'AUD', 'CAD']

interface Props {
  isOpen: boolean
  onDismiss: () => void
  trip?: Trip  // if provided, edit mode
}

const TripFormModal: React.FC<Props> = ({ isOpen, onDismiss, trip }) => {
  const [name, setName] = useState(trip?.name ?? '')
  const [destination, setDestination] = useState(trip?.destination ?? '')
  const [emoji, setEmoji] = useState(trip?.emoji ?? '✈️')
  const [coverColor, setCoverColor] = useState(trip?.coverColor ?? COLORS[0])
  const [startDate, setStartDate] = useState(trip?.startDate ?? '')
  const [endDate, setEndDate] = useState(trip?.endDate ?? '')
  const [currency, setCurrency] = useState(trip?.defaultCurrency ?? 'EUR')

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    if (trip) {
      await TripRepository.update({ id: trip.id, name, destination, emoji, coverColor, startDate, endDate, defaultCurrency: currency })
    } else {
      await TripRepository.create({ name, destination, emoji, coverColor, startDate, endDate, defaultCurrency: currency, budget: {} })
    }
    onDismiss()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{trip ? 'Edit Trip' : 'New Trip'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={handleSave} disabled={!name.trim() || !startDate || !endDate}>
              Save
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Trip name *</IonLabel>
          <IonInput value={name} onIonInput={e => setName(e.detail.value ?? '')} placeholder="e.g. Japan 2026" />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Destination</IonLabel>
          <IonInput value={destination} onIonInput={e => setDestination(e.detail.value ?? '')} placeholder="e.g. Tokyo, Japan" />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Emoji</IonLabel>
          <IonInput value={emoji} onIonInput={e => setEmoji(e.detail.value ?? '')} placeholder="🇯🇵" />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Start date *</IonLabel>
          <IonInput type="date" value={startDate} onIonInput={e => setStartDate(e.detail.value ?? '')} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">End date *</IonLabel>
          <IonInput type="date" value={endDate} onIonInput={e => setEndDate(e.detail.value ?? '')} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Default currency</IonLabel>
          <IonSelect value={currency} onIonChange={e => setCurrency(e.detail.value)}>
            {CURRENCIES.map(c => <IonSelectOption key={c} value={c}>{c}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <div style={{ padding: '1rem 0 0.5rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>Card colour</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => (
              <div
                key={c}
                onClick={() => setCoverColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: coverColor === c ? '3px solid var(--ion-color-primary)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </IonContent>
    </IonModal>
  )
}

export default TripFormModal
```

- [ ] **Step 2: Open dev server and manually test trip creation**

```bash
npm run dev
```

- Tap + button → form modal appears
- Fill in name, dates, currency → tap Save → modal closes
- Trip card appears in list

- [ ] **Step 3: Commit**

```bash
git add src/features/trips/components/TripFormModal.tsx
git commit -m "feat: trip create/edit modal with color picker"
```

---

## Task 14: Day Planner page

**Files:**
- Create: `src/features/planner/hooks/useDays.ts`
- Create: `src/features/planner/hooks/useStops.ts`
- Create: `src/features/planner/hooks/useTransportLegs.ts`
- Create: `src/features/planner/hooks/useAccommodations.ts`
- Create: `src/features/planner/components/PlannerPage.tsx`

- [ ] **Step 1: Write hooks**

```typescript
// src/features/planner/hooks/useDays.ts
import { DayRepository } from '../../../db/repositories/DayRepository'
export function useDays(tripId: string) {
  return { days: DayRepository.useByTripId(tripId) ?? [] }
}
```

```typescript
// src/features/planner/hooks/useStops.ts
import { StopRepository } from '../../../db/repositories/StopRepository'
export function useStops(dayId: string) {
  return { stops: StopRepository.useByDayId(dayId) ?? [] }
}
```

```typescript
// src/features/planner/hooks/useTransportLegs.ts
import { TransportLegRepository } from '../../../db/repositories/TransportLegRepository'
export function useTransportLegs(tripId: string) {
  return { legs: TransportLegRepository.useByTripId(tripId) ?? [] }
}
```

```typescript
// src/features/planner/hooks/useAccommodations.ts
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
export function useAccommodations(tripId: string) {
  return { accommodations: AccommodationRepository.useByTripId(tripId) ?? [] }
}
```

- [ ] **Step 2: Write `src/features/planner/components/PlannerPage.tsx`**

```typescript
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon } from '@ionic/react'
import { ellipsisVertical } from 'ionicons/icons'
import { useParams } from 'react-router-dom'
import { useDays } from '../hooks/useDays'
import DayCard from './DayCard'

const PlannerPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { days } = useDays(tripId)

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Plan</IonTitle>
          <IonButtons slot="end">
            <IonButton>
              <IonIcon icon={ellipsisVertical} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {days.map(day => (
          <DayCard key={day.id} day={day} tripId={tripId} />
        ))}
      </IonContent>
    </IonPage>
  )
}

export default PlannerPage
```

- [ ] **Step 3: Commit**

```bash
git add src/features/planner/hooks/ src/features/planner/components/PlannerPage.tsx
git commit -m "feat: planner page — renders day list from Dexie live query"
```

---

## Task 15: Day card component

**Files:**
- Create: `src/features/planner/components/DayCard.tsx`
- Create: `src/features/planner/components/StopItem.tsx`
- Create: `src/features/planner/components/TransportLegItem.tsx`
- Create: `src/features/planner/components/AccommodationBlock.tsx`
- Create: `src/features/planner/components/__tests__/DayCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/planner/components/__tests__/DayCard.test.tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import DayCard from '../DayCard'
import type { Day } from '../../../../db/schema'

vi.mock('@ionic/react', () => ionicMock)
vi.mock('../../../db/repositories/StopRepository', () => ({
  StopRepository: { useByDayId: () => [] },
}))
vi.mock('../../../db/repositories/TransportLegRepository', () => ({
  TransportLegRepository: { useByTripId: () => [] },
}))
vi.mock('../../../db/repositories/AccommodationRepository', () => ({
  AccommodationRepository: { useByTripId: () => [] },
}))

const DAY: Day = {
  id: 'day1', tripId: 'trip1', date: '2026-05-03', dayNumber: 3,
}

describe('DayCard', () => {
  it('renders day number and date', () => {
    render(<DayCard day={DAY} tripId="trip1" />)
    expect(screen.getByText(/Day 3/)).toBeInTheDocument()
    expect(screen.getByText(/May 3/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- DayCard
```

Expected: FAIL — `DayCard` not found.

- [ ] **Step 3: Write `src/features/planner/components/StopItem.tsx`**

```typescript
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { addOutline, pencilOutline, trashOutline } from 'ionicons/icons'
import type { Stop, TransportLeg } from '../../../db/schema'
import { StopRepository } from '../../../db/repositories/StopRepository'
import TransportLegItem from './TransportLegItem'
import TransportLegFormModal from './TransportLegFormModal'
import StopFormModal from './StopFormModal'

const BOOKING_COLORS: Record<string, string> = {
  not_booked: '#e74c3c',
  booked: '#f39c12',
  booked_paid: '#27ae60',
}
const METHOD_ICONS: Record<string, string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}

interface Props {
  stop: Stop
  tripId: string
  legsFromThisStop: TransportLeg[]
}

const StopItem: React.FC<Props> = ({ stop, tripId, legsFromThisStop }) => {
  const [showTransportForm, setShowTransportForm] = useState(false)
  const [showStopEditForm, setShowStopEditForm] = useState(false)

  async function handleDelete() {
    await StopRepository.delete(stop.id)
  }

  return (
    <div style={{ padding: '0.5rem 1rem', borderLeft: '3px solid var(--ion-color-primary)', marginLeft: '1rem', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontWeight: 600 }}>{stop.placeName}</span>
          {!stop.lat && <span style={{ fontSize: '0.7rem', color: 'var(--ion-color-medium)', marginLeft: 6 }}>📍 not pinned</span>}
          {stop.placeLink && (
            <a href={stop.placeLink} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: '0.8rem' }}>🔗</a>
          )}
        </div>
        <div>
          <IonButton fill="clear" size="small" onClick={() => setShowStopEditForm(true)}>
            <IonIcon icon={pencilOutline} />
          </IonButton>
          <IonButton fill="clear" size="small" color="danger" onClick={handleDelete}>
            <IonIcon icon={trashOutline} />
          </IonButton>
        </div>
      </div>

      {legsFromThisStop.map(leg => (
        <TransportLegItem key={leg.id} leg={leg} />
      ))}

      <IonButton fill="clear" size="small" onClick={() => setShowTransportForm(true)}>
        <IonIcon icon={addOutline} /> Add transport
      </IonButton>

      <TransportLegFormModal
        isOpen={showTransportForm}
        onDismiss={() => setShowTransportForm(false)}
        tripId={tripId}
        fromStopId={stop.id}
      />
      <StopFormModal
        isOpen={showStopEditForm}
        onDismiss={() => setShowStopEditForm(false)}
        tripId={tripId}
        stop={stop}
      />
    </div>
  )
}

export default StopItem
```

- [ ] **Step 4: Write `src/features/planner/components/TransportLegItem.tsx`**

```typescript
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { trashOutline } from 'ionicons/icons'
import type { TransportLeg } from '../../../db/schema'
import { TransportLegRepository, isOvernightTransport } from '../../../db/repositories/TransportLegRepository'

const METHOD_ICONS: Record<TransportLeg['method'], string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}
const STATUS_COLORS: Record<TransportLeg['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

interface Props { leg: TransportLeg }

const TransportLegItem: React.FC<Props> = ({ leg }) => {
  async function handleDelete() {
    await TransportLegRepository.delete(leg.id)
  }

  const overnight = isOvernightTransport(leg)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.3rem 0', fontSize: '0.85rem' }}>
      <span>{METHOD_ICONS[leg.method]}</span>
      {leg.departureDateTime && <span>{leg.departureDateTime.slice(11, 16)}</span>}
      {leg.arrivalDateTime && <span>→ {leg.arrivalDateTime.slice(11, 16)}</span>}
      {overnight && <span style={{ fontSize: '0.7rem', background: '#9b59b6', color: '#fff', borderRadius: 4, padding: '1px 4px' }}>overnight</span>}
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[leg.status] }} />
      <IonButton fill="clear" size="small" color="danger" onClick={handleDelete}>
        <IonIcon icon={trashOutline} />
      </IonButton>
    </div>
  )
}

export default TransportLegItem
```

- [ ] **Step 5: Write `src/features/planner/components/AccommodationBlock.tsx`**

```typescript
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { pencilOutline, trashOutline, bedOutline } from 'ionicons/icons'
import type { Accommodation } from '../../../db/schema'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import AccommodationFormModal from './AccommodationFormModal'

const STATUS_COLORS: Record<Accommodation['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

interface Props { accommodation: Accommodation }

const AccommodationBlock: React.FC<Props> = ({ accommodation }) => {
  const [showForm, setShowForm] = useState(false)

  async function handleDelete() {
    await AccommodationRepository.delete(accommodation.id)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0.4rem 1rem', background: 'var(--ion-color-light)', borderRadius: 8, margin: '0.25rem 1rem',
    }}>
      <span>🏨</span>
      <span style={{ flex: 1, fontSize: '0.9rem' }}>
        {accommodation.name}
        {accommodation.link && (
          <a href={accommodation.link} target="_blank" rel="noreferrer" style={{ marginLeft: 6, fontSize: '0.75rem' }}>🔗</a>
        )}
      </span>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[accommodation.status] }} />
      <IonButton fill="clear" size="small" onClick={() => setShowForm(true)}>
        <IonIcon icon={pencilOutline} />
      </IonButton>
      <IonButton fill="clear" size="small" color="danger" onClick={handleDelete}>
        <IonIcon icon={trashOutline} />
      </IonButton>
      <AccommodationFormModal
        isOpen={showForm}
        onDismiss={() => setShowForm(false)}
        tripId={accommodation.tripId}
        accommodation={accommodation}
      />
    </div>
  )
}

export default AccommodationBlock
```

- [ ] **Step 6: Write `src/features/planner/components/DayCard.tsx`**

```typescript
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { chevronDownOutline, chevronUpOutline, addOutline } from 'ionicons/icons'
import type { Day, TransportLeg } from '../../../db/schema'
import { useStops } from '../hooks/useStops'
import { useTransportLegs } from '../hooks/useTransportLegs'
import { useAccommodations } from '../hooks/useAccommodations'
import { DayRepository } from '../../../db/repositories/DayRepository'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import StopItem from './StopItem'
import AccommodationBlock from './AccommodationBlock'
import StopFormModal from './StopFormModal'
import AccommodationFormModal from './AccommodationFormModal'

interface Props {
  day: Day
  tripId: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

/** Inline note preview/editor — collapses to one line, expands on tap */
const NoteSection: React.FC<{ day: Day }> = ({ day }) => {
  const [expanded, setExpanded] = useState(false)
  const [value, setValue] = useState(day.notes ?? '')

  async function handleBlur() {
    await DayRepository.updateNotes(day.id, value)
  }

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{ padding: '0.25rem 1rem', fontSize: '0.8rem', color: 'var(--ion-color-medium)', cursor: 'pointer' }}
      >
        {day.notes ? day.notes.slice(0, 60) + (day.notes.length > 60 ? '…' : '') : '+ Add notes'}
      </div>
    )
  }

  return (
    <textarea
      autoFocus
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => { handleBlur(); setExpanded(false) }}
      placeholder="Notes for this day..."
      style={{ width: '100%', minHeight: 80, padding: '0.5rem 1rem', border: 'none', background: 'transparent', fontSize: '0.85rem', resize: 'vertical' }}
    />
  )
}

const DayCard: React.FC<Props> = ({ day, tripId }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [showStopForm, setShowStopForm] = useState(false)
  const [showAccomForm, setShowAccomForm] = useState(false)
  const { stops } = useStops(day.id)
  const { legs } = useTransportLegs(tripId)
  const { accommodations } = useAccommodations(tripId)

  const dayAccom = accommodations.find(a => a.id === day.accommodationId)
  const legsForStop = (stopId: string): TransportLeg[] =>
    legs.filter(l => l.fromStopId === stopId)

  return (
    <div style={{ borderRadius: 12, margin: '0.75rem 1rem', background: 'var(--ion-color-light)', overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600 }}
      >
        <span style={{ flex: 1 }}>Day {day.dayNumber} · {formatDate(day.date)}</span>
        <IonIcon icon={collapsed ? chevronDownOutline : chevronUpOutline} />
      </div>

      {!collapsed && (
        <div style={{ paddingBottom: '0.5rem' }}>
          {/* Accommodation */}
          {dayAccom
            ? <AccommodationBlock accommodation={dayAccom} />
            : (
              <IonButton fill="clear" size="small" style={{ marginLeft: '0.5rem' }} onClick={() => setShowAccomForm(true)}>
                <IonIcon icon={addOutline} /> Add accommodation
              </IonButton>
            )
          }

              {/* Stops */}
          {stops.map(stop => (
            <StopItem key={stop.id} stop={stop} tripId={tripId} legsFromThisStop={legsForStop(stop.id)} />
          ))}

          <IonButton fill="clear" size="small" style={{ marginLeft: '0.5rem' }} onClick={() => setShowStopForm(true)}>
            <IonIcon icon={addOutline} /> Add stop
          </IonButton>

          {/* Notes */}
          <NoteSection day={day} />
        </div>
      )}

      <StopFormModal isOpen={showStopForm} onDismiss={() => setShowStopForm(false)} tripId={tripId} dayId={day.id} />
      <AccommodationFormModal isOpen={showAccomForm} onDismiss={() => setShowAccomForm(false)} tripId={tripId} />
    </div>
  )
}

export default DayCard
```

- [ ] **Step 7: Run test to confirm it passes**

```bash
npm run test:run -- DayCard
```

Expected: 1 test PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/planner/components/DayCard.tsx src/features/planner/components/StopItem.tsx src/features/planner/components/TransportLegItem.tsx src/features/planner/components/AccommodationBlock.tsx src/features/planner/components/__tests__/DayCard.test.tsx
git commit -m "feat: DayCard with stops, transport legs, accommodation, and add actions"
```

---

## Task 16: Place search modal

**Files:**
- Create: `src/features/planner/components/PlaceSearchModal.tsx`

This modal is shared by StopFormModal and TransportLegFormModal. It searches Nominatim when online, falls back to plain text when offline.

- [ ] **Step 1: Write `src/features/planner/components/PlaceSearchModal.tsx`**

```typescript
import { useState } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonSearchbar, IonList, IonItem, IonLabel, IonSpinner,
} from '@ionic/react'
import { searchPlaces, type PlaceResult } from '../../../lib/geocoding'

interface Props {
  isOpen: boolean
  onDismiss: () => void
  onSelect: (result: { name: string; lat?: number; lng?: number }) => void
  title?: string
}

const PlaceSearchModal: React.FC<Props> = ({ isOpen, onDismiss, onSelect, title = 'Search place' }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(false)

  async function handleSearch(q: string) {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    if (!navigator.onLine) { setOffline(true); setResults([]); return }
    setOffline(false)
    setLoading(true)
    try {
      const found = await searchPlaces(q)
      setResults(found)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleConfirmOffline() {
    onSelect({ name: query.trim() })
    onDismiss()
  }

  function handleSelect(result: PlaceResult) {
    onSelect({ name: result.displayName.split(',')[0].trim(), lat: result.lat, lng: result.lng })
    onDismiss()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonSearchbar
          value={query}
          onIonInput={e => handleSearch(e.detail.value ?? '')}
          placeholder="Search for a place..."
          debounce={400}
        />

        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><IonSpinner /></div>}

        {offline && query.trim() && (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem' }}>
              You're offline — the place won't be pinned on the map.
              You can update it later when online.
            </p>
            <IonButton onClick={handleConfirmOffline}>Use "{query.trim()}"</IonButton>
          </div>
        )}

        {!loading && !offline && results.length > 0 && (
          <IonList>
            {results.map((r, i) => (
              <IonItem key={i} button onClick={() => handleSelect(r)}>
                <IonLabel>
                  <h3>{r.displayName.split(',')[0]}</h3>
                  <p style={{ fontSize: '0.75rem' }}>{r.displayName}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonModal>
  )
}

export default PlaceSearchModal
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planner/components/PlaceSearchModal.tsx
git commit -m "feat: PlaceSearchModal — Nominatim search with offline free-text fallback"
```

---

## Task 17: Stop form modal

**Files:**
- Create: `src/features/planner/components/StopFormModal.tsx`

- [ ] **Step 1: Write `src/features/planner/components/StopFormModal.tsx`**

```typescript
import { useState, useEffect } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonItem, IonLabel, IonInput,
} from '@ionic/react'
import { StopRepository } from '../../../db/repositories/StopRepository'
import type { Stop } from '../../../db/schema'
import PlaceSearchModal from './PlaceSearchModal'

interface Props {
  isOpen: boolean
  onDismiss: () => void
  tripId: string
  dayId?: string    // required when creating a new stop
  stop?: Stop       // provided when editing
}

const StopFormModal: React.FC<Props> = ({ isOpen, onDismiss, tripId, dayId, stop }) => {
  const [placeName, setPlaceName] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [placeLink, setPlaceLink] = useState('')
  const [showPlaceSearch, setShowPlaceSearch] = useState(false)

  useEffect(() => {
    if (stop) {
      setPlaceName(stop.placeName)
      setLat(stop.lat)
      setLng(stop.lng)
      setPlaceLink(stop.placeLink ?? '')
    } else {
      setPlaceName(''); setLat(undefined); setLng(undefined); setPlaceLink('')
    }
  }, [stop, isOpen])

  async function handleSave() {
    if (!placeName.trim()) return
    if (stop) {
      await StopRepository.update(stop.id, { placeName, lat, lng, placeLink: placeLink || undefined })
    } else {
      const existingStops = await StopRepository.getByDayId(dayId!)
      await StopRepository.create({
        dayId: dayId!, order: existingStops.length,
        placeName, lat, lng, placeLink: placeLink || undefined, usefulLinks: [],
      })
    }
    onDismiss()
  }

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonButton onClick={onDismiss}>Cancel</IonButton></IonButtons>
            <IonTitle>{stop ? 'Edit Stop' : 'Add Stop'}</IonTitle>
            <IonButtons slot="end">
              <IonButton strong onClick={handleSave} disabled={!placeName.trim()}>Save</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem button onClick={() => setShowPlaceSearch(true)}>
            <IonLabel>
              <h3>Place</h3>
              <p>{placeName || 'Search or enter a place name...'}</p>
              {lat && <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>📍 {lat.toFixed(4)}, {lng?.toFixed(4)}</p>}
              {!lat && placeName && <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-warning)' }}>Not pinned — tap to search</p>}
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Website / booking link</IonLabel>
            <IonInput value={placeLink} onIonInput={e => setPlaceLink(e.detail.value ?? '')} placeholder="https://..." />
          </IonItem>
        </IonContent>
      </IonModal>

      <PlaceSearchModal
        isOpen={showPlaceSearch}
        onDismiss={() => setShowPlaceSearch(false)}
        onSelect={r => { setPlaceName(r.name); setLat(r.lat); setLng(r.lng) }}
        title="Search stop"
      />
    </>
  )
}

export default StopFormModal
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planner/components/StopFormModal.tsx
git commit -m "feat: StopFormModal — add/edit stop with place search and pin fallback"
```

---

## Task 18: Transport leg form modal

**Files:**
- Create: `src/features/planner/components/TransportLegFormModal.tsx`

- [ ] **Step 1: Write `src/features/planner/components/TransportLegFormModal.tsx`**

```typescript
import { useState } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/react'
import { TransportLegRepository } from '../../../db/repositories/TransportLegRepository'
import type { TransportLeg } from '../../../db/schema'
import PlaceSearchModal from './PlaceSearchModal'

const METHODS: TransportLeg['method'][] = ['car', 'bus', 'train', 'plane', 'walk', 'boat', 'ferry']
const METHOD_LABELS: Record<TransportLeg['method'], string> = {
  car: '🚗 Car', bus: '🚌 Bus', train: '🚆 Train', plane: '✈️ Plane',
  walk: '🚶 Walk', boat: '⛵ Boat', ferry: '⛴️ Ferry',
}
const STATUSES: TransportLeg['status'][] = ['not_booked', 'booked', 'booked_paid']
const STATUS_LABELS: Record<TransportLeg['status'], string> = {
  not_booked: '🔴 Not booked', booked: '🟡 Booked', booked_paid: '🟢 Booked & Paid',
}

interface Props {
  isOpen: boolean
  onDismiss: () => void
  tripId: string
  fromStopId: string
}

const TransportLegFormModal: React.FC<Props> = ({ isOpen, onDismiss, tripId, fromStopId }) => {
  const [method, setMethod] = useState<TransportLeg['method']>('train')
  const [status, setStatus] = useState<TransportLeg['status']>('not_booked')
  const [departureDateTime, setDepartureDateTime] = useState('')
  const [arrivalDateTime, setArrivalDateTime] = useState('')
  const [destinationName, setDestinationName] = useState('')
  const [destinationLat, setDestinationLat] = useState<number | undefined>()
  const [destinationLng, setDestinationLng] = useState<number | undefined>()
  const [bookingLink, setBookingLink] = useState('')
  const [notes, setNotes] = useState('')
  const [showPlaceSearch, setShowPlaceSearch] = useState(false)

  async function handleSave() {
    if (!destinationName.trim()) return
    await TransportLegRepository.create({
      tripId, fromStopId, method, status,
      departureDateTime: departureDateTime || undefined,
      arrivalDateTime: arrivalDateTime || undefined,
      destinationName, destinationLat, destinationLng,
      bookingLink: bookingLink || undefined,
      notes: notes || undefined,
    })
    onDismiss()
  }

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonButton onClick={onDismiss}>Cancel</IonButton></IonButtons>
            <IonTitle>Add Transport</IonTitle>
            <IonButtons slot="end">
              <IonButton strong onClick={handleSave} disabled={!destinationName.trim()}>Save</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Method</IonLabel>
            <IonSelect value={method} onIonChange={e => setMethod(e.detail.value)}>
              {METHODS.map(m => <IonSelectOption key={m} value={m}>{METHOD_LABELS[m]}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Status</IonLabel>
            <IonSelect value={status} onIonChange={e => setStatus(e.detail.value)}>
              {STATUSES.map(s => <IonSelectOption key={s} value={s}>{STATUS_LABELS[s]}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Departure date & time</IonLabel>
            <IonInput type="datetime-local" value={departureDateTime} onIonInput={e => setDepartureDateTime(e.detail.value ?? '')} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Arrival date & time</IonLabel>
            <IonInput type="datetime-local" value={arrivalDateTime} onIonInput={e => setArrivalDateTime(e.detail.value ?? '')} />
          </IonItem>
          <IonItem button onClick={() => setShowPlaceSearch(true)}>
            <IonLabel>
              <h3>Destination *</h3>
              <p>{destinationName || 'Search or enter destination...'}</p>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Booking link</IonLabel>
            <IonInput value={bookingLink} onIonInput={e => setBookingLink(e.detail.value ?? '')} placeholder="https://..." />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Notes</IonLabel>
            <IonInput value={notes} onIonInput={e => setNotes(e.detail.value ?? '')} placeholder="Platform 3, seat 14A..." />
          </IonItem>
        </IonContent>
      </IonModal>

      <PlaceSearchModal
        isOpen={showPlaceSearch}
        onDismiss={() => setShowPlaceSearch(false)}
        onSelect={r => { setDestinationName(r.name); setDestinationLat(r.lat); setDestinationLng(r.lng) }}
        title="Search destination"
      />
    </>
  )
}

export default TransportLegFormModal
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planner/components/TransportLegFormModal.tsx
git commit -m "feat: TransportLegFormModal — add transport from stop with destination search"
```

---

## Task 19: Accommodation form modal

**Files:**
- Create: `src/features/planner/components/AccommodationFormModal.tsx`

- [ ] **Step 1: Write `src/features/planner/components/AccommodationFormModal.tsx`**

```typescript
import { useState, useEffect } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/react'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import type { Accommodation } from '../../../db/schema'

const STATUSES: Accommodation['status'][] = ['not_booked', 'booked', 'booked_paid']
const STATUS_LABELS: Record<Accommodation['status'], string> = {
  not_booked: '🔴 Not booked', booked: '🟡 Booked', booked_paid: '🟢 Booked & Paid',
}

interface Props {
  isOpen: boolean
  onDismiss: () => void
  tripId: string
  accommodation?: Accommodation
}

const AccommodationFormModal: React.FC<Props> = ({ isOpen, onDismiss, tripId, accommodation }) => {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Accommodation['status']>('not_booked')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [link, setLink] = useState('')
  const [confirmationLink, setConfirmationLink] = useState('')

  useEffect(() => {
    if (accommodation) {
      setName(accommodation.name)
      setStatus(accommodation.status)
      setCheckIn(accommodation.checkIn)
      setCheckOut(accommodation.checkOut)
      setLink(accommodation.link ?? '')
      setConfirmationLink(accommodation.confirmationLink ?? '')
    } else {
      setName(''); setStatus('not_booked'); setCheckIn(''); setCheckOut(''); setLink(''); setConfirmationLink('')
    }
  }, [accommodation, isOpen])

  async function handleSave() {
    if (!name.trim() || !checkIn || !checkOut) return
    const data = {
      tripId, name, status, checkIn, checkOut,
      link: link || undefined,
      confirmationLink: confirmationLink || undefined,
      usefulLinks: [],
    }
    if (accommodation) {
      await AccommodationRepository.update(accommodation.id, { name, status, checkIn, checkOut, link: link || undefined, confirmationLink: confirmationLink || undefined })
    } else {
      await AccommodationRepository.create(data)
    }
    onDismiss()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onDismiss}>Cancel</IonButton></IonButtons>
          <IonTitle>{accommodation ? 'Edit Accommodation' : 'Add Accommodation'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={handleSave} disabled={!name.trim() || !checkIn || !checkOut}>Save</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Name *</IonLabel>
          <IonInput value={name} onIonInput={e => setName(e.detail.value ?? '')} placeholder="e.g. Hotel Granvia" />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Status</IonLabel>
          <IonSelect value={status} onIonChange={e => setStatus(e.detail.value)}>
            {STATUSES.map(s => <IonSelectOption key={s} value={s}>{STATUS_LABELS[s]}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Check-in *</IonLabel>
          <IonInput type="date" value={checkIn} onIonInput={e => setCheckIn(e.detail.value ?? '')} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Check-out * (exclusive)</IonLabel>
          <IonInput type="date" value={checkOut} onIonInput={e => setCheckOut(e.detail.value ?? '')} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Property website</IonLabel>
          <IonInput value={link} onIonInput={e => setLink(e.detail.value ?? '')} placeholder="https://..." />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Confirmation / booking link</IonLabel>
          <IonInput value={confirmationLink} onIonInput={e => setConfirmationLink(e.detail.value ?? '')} placeholder="https://..." />
        </IonItem>
      </IonContent>
    </IonModal>
  )
}

export default AccommodationFormModal
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planner/components/AccommodationFormModal.tsx
git commit -m "feat: AccommodationFormModal — add/edit accommodation with auto day-assignment"
```

---

## Task 20: Final verification

- [ ] **Step 1: Run all tests**

```bash
npm run test:run
```

Expected: all tests PASS, 0 failures.

- [ ] **Step 2: Build for production**

```bash
npm run build
```

Expected: no TypeScript errors, build succeeds in `dist/`.

- [ ] **Step 3: Manual end-to-end smoke test**

```bash
npm run dev
```

Walk through:
1. Home screen shows "No trips yet"
2. Tap + → create trip (fill name, dates, currency) → trip card appears
3. Tap trip card → opens Plan tab with day cards (one per date)
4. Tap "Add stop" → place search modal → search "Tokyo" → select result → stop appears in day
5. Tap "Add transport" on a stop → fill arrival time, search destination → save → transport leg + new stop on arrival day
6. Tap "Add accommodation" on a day → fill details → accommodation block appears, adjacent days update automatically
7. Confirm: tabs (Plan, Calendar, Expenses, Map, Packing) are all accessible and show placeholder content where not yet built

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: foundation complete — trip CRUD, day planner, stops, transport, accommodation"
```

---

## What's next

**Plan 2** covers build steps 4–8:
- Calendar tab (hybrid monthly grid with accommodation bars)
- Expenses tab (logging, currency conversion, budget tracking)
- Packing list tab
- Map tab (Leaflet + OSRM routing + stop markers)

**Plan 3** covers build steps 9–13:
- Trip summary screen
- Global settings screen (expense categories management)
- Export / Import JSON
- Google Drive sync + OAuth2
- PWA polish (install prompt, offline handling, caching strategy)
