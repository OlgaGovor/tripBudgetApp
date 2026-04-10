# TripBudget Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four remaining trip tabs — Calendar (hybrid monthly grid with accommodation bars), Expenses (multi-currency logging + budget tracking), Packing (checklist + weight), and Map (Leaflet + OSRM routing + stop markers).

**Architecture:** Same repository layer + feature modules as Plan 1. New repositories follow the identical Dexie pattern established in Plan 1.

**Tech Stack:** React 18 + TypeScript + Ionic React, Dexie.js + dexie-react-hooks, Leaflet + react-leaflet, Frankfurter API (ECB rates), OSRM (road routing), Vitest + React Testing Library

**Covers:** Build steps 4–8. Requires Plan 1 complete first.
**Plan 3** covers steps 9–13 (Summary, Settings, Export/Import, Drive Sync, PWA polish).

---

## File Map

```
src/
├── lib/
│   ├── currency.ts                                # Frankfurter fetch + rate caching
│   ├── budget.ts                                  # Pure budget status functions
│   ├── routing.ts                                 # OSRM fetch + great-circle arc
│   └── __tests__/
│       ├── currency.test.ts
│       ├── budget.test.ts
│       └── routing.test.ts
├── db/repositories/
│   ├── ExpenseCategoryRepository.ts
│   ├── ExpenseRepository.ts
│   ├── PackingRepository.ts
│   └── __tests__/
│       ├── ExpenseCategoryRepository.test.ts
│       ├── ExpenseRepository.test.ts
│       └── PackingRepository.test.ts
└── features/
    ├── calendar/components/
    │   ├── CalendarPage.tsx
    │   ├── CalendarGrid.tsx
    │   └── DayCell.tsx
    ├── expenses/
    │   ├── hooks/useExpenses.ts
    │   └── components/
    │       ├── ExpensesPage.tsx
    │       ├── ExpenseFormModal.tsx
    │       └── BudgetBar.tsx
    ├── packing/
    │   ├── hooks/usePacking.ts
    │   └── components/
    │       ├── PackingPage.tsx
    │       └── PackingItemRow.tsx
    └── map/
        ├── hooks/useMapData.ts
        └── components/
            └── MapPage.tsx
```

---

## Task 1: Currency lib

**Files:**
- Create: `src/lib/currency.ts`
- Create: `src/lib/__tests__/currency.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/currency.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '../../db/db'
import { getExchangeRates, convertAmount } from '../currency'

beforeEach(async () => { await db.exchangeRateCache.clear() })

describe('convertAmount', () => {
  const rates = { EUR: 1, USD: 1.08, PLN: 4.25, JPY: 160 }

  it('converts USD to PLN', () => {
    // 100 USD → EUR → PLN: 100 / 1.08 * 4.25 ≈ 393.52
    expect(convertAmount(100, 'USD', 'PLN', rates)).toBeCloseTo(393.52, 1)
  })

  it('returns same amount when currencies are equal', () => {
    expect(convertAmount(50, 'EUR', 'EUR', rates)).toBe(50)
  })
})

describe('getExchangeRates', () => {
  it('fetches and caches rates when no cache exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'EUR', rates: { USD: 1.08, PLN: 4.25 } }),
    }))
    const { rates, stale } = await getExchangeRates()
    expect(rates['USD']).toBe(1.08)
    expect(stale).toBe(false)
    const cached = await db.exchangeRateCache.get('EUR')
    expect(cached).toBeTruthy()
    vi.restoreAllMocks()
  })

  it('returns stale=true and uses cache when offline and cache exists', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    await db.exchangeRateCache.put({ base: 'EUR', rates: { USD: 1.05 }, fetchedAt: oldDate })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { rates, stale } = await getExchangeRates()
    expect(rates['USD']).toBe(1.05)
    expect(stale).toBe(true)
    vi.restoreAllMocks()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- currency
```

Expected: FAIL — `currency` module not found.

- [ ] **Step 3: Write `src/lib/currency.ts`**

```typescript
import { db } from '../db/db'

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?base=EUR'
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000

export async function getExchangeRates(): Promise<{ rates: Record<string, number>; stale: boolean }> {
  const cached = await db.exchangeRateCache.get('EUR')
  const age = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity
  const isFresh = age < STALE_THRESHOLD_MS

  if (cached && isFresh) return { rates: { EUR: 1, ...cached.rates }, stale: false }

  try {
    const res = await fetch(FRANKFURTER_URL)
    if (!res.ok) throw new Error('Frankfurter error')
    const data: { rates: Record<string, number> } = await res.json()
    await db.exchangeRateCache.put({ base: 'EUR', rates: data.rates, fetchedAt: new Date().toISOString() })
    return { rates: { EUR: 1, ...data.rates }, stale: false }
  } catch {
    if (cached) return { rates: { EUR: 1, ...cached.rates }, stale: true }
    throw new Error('No exchange rate data available')
  }
}

/** Convert amount from one currency to another via EUR as base. */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount
  const inEur = amount / (rates[fromCurrency] ?? 1)
  return inEur * (rates[toCurrency] ?? 1)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- currency
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/currency.ts src/lib/__tests__/currency.test.ts
git commit -m "feat: currency lib — Frankfurter fetch with 24h cache and stale fallback"
```

---

## Task 2: Budget lib

**Files:**
- Create: `src/lib/budget.ts`
- Create: `src/lib/__tests__/budget.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/budget.test.ts
import { describe, it, expect } from 'vitest'
import { getDailyBudgetStatus, getTotalBudgetStatus } from '../budget'

describe('getDailyBudgetStatus', () => {
  it('returns under when spent < 95% of cumulative budget', () => {
    // dailyAmount=100, 5 days elapsed → budget=500; spent=400 → 80%
    expect(getDailyBudgetStatus(400, 100, 5)).toBe('under')
  })

  it('returns warning when spent 95–100%', () => {
    // budget=500, spent=490 → 98%
    expect(getDailyBudgetStatus(490, 100, 5)).toBe('warning')
  })

  it('returns over when spent > 100%', () => {
    expect(getDailyBudgetStatus(510, 100, 5)).toBe('over')
  })
})

describe('getTotalBudgetStatus', () => {
  it('returns under when spend pace is below 95%', () => {
    // total=1000, 3/10 days elapsed → pace=300; spent=200 → 67%
    expect(getTotalBudgetStatus(200, 1000, 3, 10)).toBe('under')
  })

  it('returns warning when pace 95–100%', () => {
    expect(getTotalBudgetStatus(295, 1000, 3, 10)).toBe('warning')
  })

  it('returns over when pace exceeded', () => {
    expect(getTotalBudgetStatus(310, 1000, 3, 10)).toBe('over')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- budget
```

- [ ] **Step 3: Write `src/lib/budget.ts`**

```typescript
export type BudgetStatus = 'under' | 'warning' | 'over'

export function getDailyBudgetStatus(
  spent: number,
  dailyAmount: number,
  daysElapsed: number
): BudgetStatus {
  const cumulativeBudget = dailyAmount * daysElapsed
  if (cumulativeBudget === 0) return 'under'
  const ratio = spent / cumulativeBudget
  if (ratio > 1) return 'over'
  if (ratio >= 0.95) return 'warning'
  return 'under'
}

export function getTotalBudgetStatus(
  spent: number,
  total: number,
  daysElapsed: number,
  totalDays: number
): BudgetStatus {
  if (total === 0 || totalDays === 0) return 'under'
  const pace = (daysElapsed / totalDays) * total
  if (pace === 0) return 'under'
  const ratio = spent / pace
  if (ratio > 1) return 'over'
  if (ratio >= 0.95) return 'warning'
  return 'under'
}

export const STATUS_COLORS: Record<BudgetStatus, string> = {
  under: '#27ae60',
  warning: '#f39c12',
  over: '#e74c3c',
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- budget
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/budget.ts src/lib/__tests__/budget.test.ts
git commit -m "feat: budget lib — daily and total budget status with green/yellow/red thresholds"
```

---

## Task 3: Routing lib

**Files:**
- Create: `src/lib/routing.ts`
- Create: `src/lib/__tests__/routing.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/routing.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRoadRoute, greatCircleArc } from '../routing'

beforeEach(() => { vi.restoreAllMocks() })

describe('greatCircleArc', () => {
  it('returns 20 interpolated points between two coordinates', () => {
    const points = greatCircleArc({ lat: 48.85, lng: 2.35 }, { lat: 51.50, lng: -0.12 })
    expect(points).toHaveLength(20)
    // First point near Paris
    expect(points[0][0]).toBeCloseTo(48.85, 1)
    // Last point near London
    expect(points[19][0]).toBeCloseTo(51.50, 1)
  })
})

describe('fetchRoadRoute', () => {
  it('maps OSRM GeoJSON response to [lat, lng] pairs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [{ geometry: { coordinates: [[2.35, 48.85], [2.40, 48.88]] } }],
      }),
    }))
    const points = await fetchRoadRoute({ lat: 48.85, lng: 2.35 }, { lat: 48.88, lng: 2.40 })
    expect(points).toEqual([[48.85, 2.35], [48.88, 2.40]])
  })

  it('throws when OSRM returns no routes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [] }),
    }))
    await expect(fetchRoadRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- routing
```

- [ ] **Step 3: Write `src/lib/routing.ts`**

```typescript
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

export async function fetchRoadRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<[number, number][]> {
  const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error('OSRM request failed')
  const data = await res.json()
  if (!data.routes?.length) throw new Error('OSRM returned no routes')
  // OSRM GeoJSON uses [lng, lat] — flip to [lat, lng] for Leaflet
  return (data.routes[0].geometry.coordinates as [number, number][]).map(
    ([lng, lat]) => [lat, lng]
  )
}

/** Linear interpolation of 20 points along a great-circle arc (good enough for display). */
export function greatCircleArc(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  steps = 20
): [number, number][] {
  const points: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    points.push([
      from.lat + (to.lat - from.lat) * t,
      from.lng + (to.lng - from.lng) * t,
    ])
  }
  return points
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- routing
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/routing.ts src/lib/__tests__/routing.test.ts
git commit -m "feat: routing lib — OSRM road route fetch and great-circle arc interpolation"
```

---

## Task 4: ExpenseCategoryRepository

**Files:**
- Create: `src/db/repositories/ExpenseCategoryRepository.ts`
- Create: `src/db/repositories/__tests__/ExpenseCategoryRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/db/repositories/__tests__/ExpenseCategoryRepository.test.ts
import { beforeEach, describe, it, expect } from 'vitest'
import { db } from '../../db'
import { ExpenseCategoryRepository } from '../ExpenseCategoryRepository'

beforeEach(async () => { await db.expenseCategories.clear() })

describe('ExpenseCategoryRepository.ensureSeeded', () => {
  it('creates 4 default categories on first call', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    const all = await db.expenseCategories.toArray()
    expect(all).toHaveLength(4)
    expect(all.map(c => c.label)).toContain('Food')
  })

  it('does not duplicate categories on second call', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    await ExpenseCategoryRepository.ensureSeeded()
    const all = await db.expenseCategories.toArray()
    expect(all).toHaveLength(4)
  })
})

describe('ExpenseCategoryRepository.resetToDefaults', () => {
  it('replaces all categories with the 4 defaults', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    await ExpenseCategoryRepository.create({ label: 'Custom', color: '#fff', icon: '🎯' })
    await ExpenseCategoryRepository.resetToDefaults()
    const all = await db.expenseCategories.toArray()
    expect(all).toHaveLength(4)
    expect(all.every(c => ['Accommodation', 'Transport', 'Food', 'Other'].includes(c.label))).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- ExpenseCategoryRepository
```

- [ ] **Step 3: Write `src/db/repositories/ExpenseCategoryRepository.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { ExpenseCategory } from '../schema'

export const DEFAULT_CATEGORIES: Omit<ExpenseCategory, 'id'>[] = [
  { label: 'Accommodation', color: '#4A90D9', icon: '🏨' },
  { label: 'Transport',     color: '#7B68EE', icon: '🚌' },
  { label: 'Food',          color: '#F5A623', icon: '🍕' },
  { label: 'Other',         color: '#9B9B9B', icon: '📦' },
]

export const ExpenseCategoryRepository = {
  useAll() {
    return useLiveQuery(() => db.expenseCategories.toArray(), [])
  },

  async ensureSeeded(): Promise<void> {
    const count = await db.expenseCategories.count()
    if (count > 0) return
    await db.expenseCategories.bulkAdd(
      DEFAULT_CATEGORIES.map(c => ({ ...c, id: `cat-${c.label.toLowerCase()}` }))
    )
  },

  async create(input: Omit<ExpenseCategory, 'id'>): Promise<string> {
    const id = uuidv4()
    await db.expenseCategories.add({ ...input, id })
    return id
  },

  async update(id: string, updates: Partial<Omit<ExpenseCategory, 'id'>>): Promise<void> {
    await db.expenseCategories.update(id, updates)
  },

  async delete(id: string): Promise<void> {
    await db.expenseCategories.delete(id)
  },

  async resetToDefaults(): Promise<void> {
    await db.expenseCategories.clear()
    await db.expenseCategories.bulkAdd(
      DEFAULT_CATEGORIES.map(c => ({ ...c, id: `cat-${c.label.toLowerCase()}` }))
    )
  },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- ExpenseCategoryRepository
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Call `ensureSeeded` on app startup in `src/main.tsx`**

Add after `setupIonicReact()`:
```typescript
import { ExpenseCategoryRepository } from './db/repositories/ExpenseCategoryRepository'
// ...
setupIonicReact()
ExpenseCategoryRepository.ensureSeeded()
```

- [ ] **Step 6: Commit**

```bash
git add src/db/repositories/ExpenseCategoryRepository.ts src/db/repositories/__tests__/ExpenseCategoryRepository.test.ts src/main.tsx
git commit -m "feat: ExpenseCategoryRepository with default seeding"
```

---

## Task 5: ExpenseRepository

**Files:**
- Create: `src/db/repositories/ExpenseRepository.ts`
- Create: `src/db/repositories/__tests__/ExpenseRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/db/repositories/__tests__/ExpenseRepository.test.ts
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { db } from '../../db'
import { ExpenseRepository } from '../ExpenseRepository'

// Mock currency so tests don't make real network calls
vi.mock('../../lib/currency', () => ({
  getExchangeRates: async () => ({ rates: { EUR: 1, USD: 1.08, PLN: 4.25 }, stale: false }),
  convertAmount: (amount: number, from: string, to: string, rates: Record<string, number>) => {
    if (from === to) return amount
    return (amount / rates[from]) * rates[to]
  },
}))

beforeEach(async () => {
  await Promise.all([db.trips.clear(), db.expenses.clear()])
  await db.trips.add({
    id: 'trip1', name: 'T', destination: 'D', emoji: '✈️', coverColor: '#fff',
    startDate: '2026-06-01', endDate: '2026-06-07', defaultCurrency: 'PLN',
    budget: { dailyAmount: 200 }, createdAt: '', updatedAt: '',
  })
})

describe('ExpenseRepository.create', () => {
  it('auto-converts amount to trip default currency and stores convertedAt', async () => {
    const id = await ExpenseRepository.create({
      tripId: 'trip1', categoryId: 'cat-food',
      amount: 10, currency: 'USD', date: '2026-06-01',
    })
    const saved = await db.expenses.get(id)
    expect(saved?.amountConverted).toBeCloseTo(10 / 1.08 * 4.25, 1)
    expect(saved?.convertedAt).toBeTruthy()
  })

  it('stores original amount and currency unchanged', async () => {
    const id = await ExpenseRepository.create({
      tripId: 'trip1', categoryId: 'cat-food',
      amount: 50, currency: 'PLN', date: '2026-06-01',
    })
    const saved = await db.expenses.get(id)
    expect(saved?.amount).toBe(50)
    expect(saved?.currency).toBe('PLN')
    expect(saved?.amountConverted).toBeCloseTo(50, 1)
  })
})

describe('ExpenseRepository.getTotalConverted', () => {
  it('sums amountConverted for all trip expenses', async () => {
    await ExpenseRepository.create({ tripId: 'trip1', categoryId: 'cat-food', amount: 100, currency: 'PLN', date: '2026-06-01' })
    await ExpenseRepository.create({ tripId: 'trip1', categoryId: 'cat-food', amount: 100, currency: 'PLN', date: '2026-06-02' })
    const total = await ExpenseRepository.getTotalConverted('trip1')
    expect(total).toBeCloseTo(200, 1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- ExpenseRepository
```

- [ ] **Step 3: Write `src/db/repositories/ExpenseRepository.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Expense } from '../schema'
import { getExchangeRates, convertAmount } from '../../lib/currency'

type CreateInput = {
  tripId: string
  dayId?: string
  categoryId: string
  amount: number
  currency: string
  date: string
  note?: string
}

export const ExpenseRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.expenses.where('tripId').equals(tripId).reverse().sortBy('date'),
      [tripId]
    )
  },

  async create(input: CreateInput): Promise<string> {
    const trip = await db.trips.get(input.tripId)
    if (!trip) throw new Error(`Trip ${input.tripId} not found`)
    const { rates } = await getExchangeRates()
    const amountConverted = convertAmount(input.amount, input.currency, trip.defaultCurrency, rates)
    const id = uuidv4()
    await db.expenses.add({
      ...input,
      id,
      amountConverted,
      convertedAt: new Date().toISOString(),
    })
    return id
  },

  async update(id: string, updates: Partial<Omit<Expense, 'id' | 'tripId'>>): Promise<void> {
    const existing = await db.expenses.get(id)
    if (!existing) throw new Error(`Expense ${id} not found`)
    let amountConverted = existing.amountConverted
    let convertedAt = existing.convertedAt
    if (updates.amount !== undefined || updates.currency !== undefined) {
      const trip = await db.trips.get(existing.tripId)
      if (trip) {
        const { rates } = await getExchangeRates()
        const amount = updates.amount ?? existing.amount
        const currency = updates.currency ?? existing.currency
        amountConverted = convertAmount(amount, currency, trip.defaultCurrency, rates)
        convertedAt = new Date().toISOString()
      }
    }
    await db.expenses.update(id, { ...updates, amountConverted, convertedAt })
  },

  async delete(id: string): Promise<void> {
    await db.expenses.delete(id)
  },

  async getTotalConverted(tripId: string): Promise<number> {
    const expenses = await db.expenses.where('tripId').equals(tripId).toArray()
    return expenses.reduce((sum, e) => sum + e.amountConverted, 0)
  },

  async getByDay(dayId: string): Promise<Expense[]> {
    return db.expenses.where('dayId').equals(dayId).toArray()
  },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- ExpenseRepository
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/ExpenseRepository.ts src/db/repositories/__tests__/ExpenseRepository.test.ts
git commit -m "feat: ExpenseRepository with auto currency conversion on create/update"
```

---

## Task 6: PackingRepository

**Files:**
- Create: `src/db/repositories/PackingRepository.ts`
- Create: `src/db/repositories/__tests__/PackingRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/db/repositories/__tests__/PackingRepository.test.ts
import { beforeEach, describe, it, expect } from 'vitest'
import { db } from '../../db'
import { PackingRepository } from '../PackingRepository'

beforeEach(async () => { await db.packingItems.clear() })

describe('PackingRepository.toggleChecked', () => {
  it('flips checked from false to true', async () => {
    const id = await PackingRepository.create({ tripId: 'trip1', label: 'Passport', checked: false, order: 0 })
    await PackingRepository.toggleChecked(id)
    expect((await db.packingItems.get(id))?.checked).toBe(true)
  })
})

describe('PackingRepository.copyFromTrip', () => {
  it('copies items unchecked with weights preserved and new ids', async () => {
    const id1 = await PackingRepository.create({ tripId: 'src', label: 'Camera', checked: true, order: 0, weightGrams: 500 })
    const id2 = await PackingRepository.create({ tripId: 'src', label: 'Charger', checked: false, order: 1 })
    await PackingRepository.copyFromTrip('src', 'dest')
    const copied = await db.packingItems.where('tripId').equals('dest').toArray()
    expect(copied).toHaveLength(2)
    expect(copied.every(i => i.checked === false)).toBe(true)
    expect(copied.find(i => i.label === 'Camera')?.weightGrams).toBe(500)
    expect(copied.every(i => i.id !== id1 && i.id !== id2)).toBe(true)
  })
})

describe('PackingRepository.getTotalWeightGrams', () => {
  it('sums weights of all items (checked and unchecked)', async () => {
    await PackingRepository.create({ tripId: 'trip1', label: 'A', checked: false, order: 0, weightGrams: 300 })
    await PackingRepository.create({ tripId: 'trip1', label: 'B', checked: true, order: 1, weightGrams: 200 })
    await PackingRepository.create({ tripId: 'trip1', label: 'C', checked: false, order: 2 }) // no weight
    const total = await PackingRepository.getTotalWeightGrams('trip1')
    expect(total).toBe(500)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- PackingRepository
```

- [ ] **Step 3: Write `src/db/repositories/PackingRepository.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { PackingItem } from '../schema'

type CreateInput = Omit<PackingItem, 'id'>

export const PackingRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.packingItems.where('tripId').equals(tripId).sortBy('order'),
      [tripId]
    )
  },

  async create(input: CreateInput): Promise<string> {
    const id = uuidv4()
    await db.packingItems.add({ ...input, id })
    return id
  },

  async update(id: string, updates: Partial<Omit<PackingItem, 'id'>>): Promise<void> {
    await db.packingItems.update(id, updates)
  },

  async delete(id: string): Promise<void> {
    await db.packingItems.delete(id)
  },

  async toggleChecked(id: string): Promise<void> {
    const item = await db.packingItems.get(id)
    if (item) await db.packingItems.update(id, { checked: !item.checked })
  },

  async copyFromTrip(sourceTripId: string, targetTripId: string): Promise<void> {
    const items = await db.packingItems.where('tripId').equals(sourceTripId).toArray()
    await db.packingItems.bulkAdd(
      items.map(item => ({ ...item, id: uuidv4(), tripId: targetTripId, checked: false }))
    )
  },

  async getTotalWeightGrams(tripId: string): Promise<number> {
    const items = await db.packingItems.where('tripId').equals(tripId).toArray()
    return items.reduce((sum, i) => sum + (i.weightGrams ?? 0), 0)
  },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- PackingRepository
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/PackingRepository.ts src/db/repositories/__tests__/PackingRepository.test.ts
git commit -m "feat: PackingRepository with toggle, copy-from-trip, and weight total"
```

---

## Task 7: Calendar view

**Files:**
- Create: `src/features/calendar/components/CalendarPage.tsx`
- Create: `src/features/calendar/components/CalendarGrid.tsx`
- Create: `src/features/calendar/components/DayCell.tsx`
- Modify: `src/components/TripShell.tsx` — replace Calendar placeholder

- [ ] **Step 1: Write `src/features/calendar/components/DayCell.tsx`**

```typescript
import type { Day, Accommodation, TransportLeg } from '../../../db/schema'
import type { BudgetStatus } from '../../../lib/budget'

const STATUS_DOT: Record<BudgetStatus, string> = { under: '#27ae60', warning: '#f39c12', over: '#e74c3c' }
const ACCOM_COLORS: Record<Accommodation['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}
const METHOD_ICONS: Record<string, string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}

interface Props {
  calendarDate: string       // YYYY-MM-DD — the calendar date shown in this cell
  day?: Day                  // if in trip range
  accommodation?: Accommodation
  departingLegs: TransportLeg[]
  firstStopName?: string
  budgetStatus?: BudgetStatus
  isInHighlightRange: boolean
  onClick?: () => void
}

const DayCell: React.FC<Props> = ({
  calendarDate, day, accommodation, departingLegs, firstStopName,
  budgetStatus, isInHighlightRange, onClick,
}) => {
  const dateNum = parseInt(calendarDate.slice(8), 10)
  const isTrip = !!day
  const hasGap = isTrip && !accommodation && !departingLegs.some(l => l.arrivalDateTime)
  const accomColor = accommodation ? ACCOM_COLORS[accommodation.status] : undefined

  return (
    <div
      onClick={isTrip ? onClick : undefined}
      style={{
        minHeight: 64,
        padding: '4px 2px',
        background: isInHighlightRange ? 'rgba(56,128,255,0.08)' : hasGap ? 'rgba(231,76,60,0.08)' : 'transparent',
        opacity: isTrip ? 1 : 0.35,
        cursor: isTrip ? 'pointer' : 'default',
        position: 'relative',
        borderRadius: 4,
      }}
    >
      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{dateNum}</span>
      {day && (
        <>
          <div style={{ fontSize: '0.6rem', color: 'var(--ion-color-medium)' }}>Day {day.dayNumber}</div>
          {firstStopName && (
            <div style={{ fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {firstStopName.slice(0, 12)}
            </div>
          )}
          {accomColor && (
            <div style={{ height: 3, background: accomColor, borderRadius: 2, marginTop: 2 }} />
          )}
          <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', marginTop: 1 }}>
            {departingLegs.map((l, i) => (
              <span key={i} style={{ fontSize: '0.55rem' }}>{METHOD_ICONS[l.method] ?? '🚐'}</span>
            ))}
          </div>
          {budgetStatus && (
            <div style={{
              position: 'absolute', bottom: 3, right: 3,
              width: 6, height: 6, borderRadius: '50%',
              background: STATUS_DOT[budgetStatus],
            }} />
          )}
        </>
      )}
    </div>
  )
}

export default DayCell
```

- [ ] **Step 2: Write `src/features/calendar/components/CalendarGrid.tsx`**

```typescript
import { useMemo } from 'react'
import type { Day, Accommodation, TransportLeg } from '../../../db/schema'
import type { BudgetStatus } from '../../../lib/budget'
import DayCell from './DayCell'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1))
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

interface Props {
  year: number
  month: number  // 0-based
  days: Day[]
  accommodations: Accommodation[]
  legs: TransportLeg[]
  stopNamesByDayId: Record<string, string>
  budgetStatusByDate: Record<string, BudgetStatus>
  highlightRange?: { from: string; to: string }
  onDayClick: (date: string) => void
}

const CalendarGrid: React.FC<Props> = ({
  year, month, days, accommodations, legs,
  stopNamesByDayId, budgetStatusByDate, highlightRange, onDayClick,
}) => {
  const cells = useMemo(() => {
    const first = startOfMonth(year, month)
    // Monday = 0 offset
    const startOffset = (first.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const total = startOffset + daysInMonth
    const grid: (string | null)[] = []
    for (let i = 0; i < startOffset; i++) grid.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(isoDate(new Date(Date.UTC(year, month, d))))
    }
    return grid
  }, [year, month])

  const dayByDate = useMemo(() => new Map(days.map(d => [d.date, d])), [days])
  const accomByDayId = useMemo(() => {
    const m = new Map<string, Accommodation>()
    days.forEach(d => {
      if (d.accommodationId) {
        const a = accommodations.find(a => a.id === d.accommodationId)
        if (a) m.set(d.id, a)
      }
    })
    return m
  }, [days, accommodations])
  const legsByDate = useMemo(() => {
    const m = new Map<string, TransportLeg[]>()
    legs.forEach(l => {
      if (l.departureDateTime) {
        const date = l.departureDateTime.slice(0, 10)
        m.set(date, [...(m.get(date) ?? []), l])
      }
    })
    return m
  }, [legs])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
      {WEEKDAYS.map(d => (
        <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--ion-color-medium)', padding: '4px 0' }}>
          {d}
        </div>
      ))}
      {cells.map((date, i) => {
        if (!date) return <div key={`empty-${i}`} />
        const day = dayByDate.get(date)
        const inRange = highlightRange ? date >= highlightRange.from && date <= highlightRange.to : false
        return (
          <DayCell
            key={date}
            calendarDate={date}
            day={day}
            accommodation={day ? accomByDayId.get(day.id) : undefined}
            departingLegs={legsByDate.get(date) ?? []}
            firstStopName={day ? stopNamesByDayId[day.id] : undefined}
            budgetStatus={budgetStatusByDate[date]}
            isInHighlightRange={inRange}
            onClick={() => onDayClick(date)}
          />
        )
      })}
    </div>
  )
}

export default CalendarGrid
```

- [ ] **Step 3: Write `src/features/calendar/components/CalendarPage.tsx`**

```typescript
import { useMemo, useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon,
} from '@ionic/react'
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { useDays } from '../../planner/hooks/useDays'
import { useTransportLegs } from '../../planner/hooks/useTransportLegs'
import { useAccommodations } from '../../planner/hooks/useAccommodations'
import { StopRepository } from '../../../db/repositories/StopRepository'
import CalendarGrid from './CalendarGrid'
import type { BudgetStatus } from '../../../lib/budget'

type FilterMode = 'next10' | 'next20' | 'next30' | 'all'

const CalendarPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { days } = useDays(tripId)
  const { legs } = useTransportLegs(tripId)
  const { accommodations } = useAccommodations(tripId)
  const history = useHistory()

  const today = new Date().toISOString().slice(0, 10)
  const [viewYear, setViewYear] = useState(() => new Date().getUTCFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getUTCMonth())
  const [filter, setFilter] = useState<FilterMode>('all')

  const highlightRange = useMemo((): { from: string; to: string } | undefined => {
    if (filter === 'all') return undefined
    const n = filter === 'next10' ? 10 : filter === 'next20' ? 20 : 30
    const end = new Date(today + 'T00:00:00Z')
    end.setUTCDate(end.getUTCDate() + n - 1)
    return { from: today, to: end.toISOString().slice(0, 10) }
  }, [filter, today])

  // Collect first stop name per day
  const [stopNamesByDayId, setStopNamesByDayId] = useState<Record<string, string>>({})
  useMemo(() => {
    Promise.all(
      days.map(async d => {
        const stops = await StopRepository.getByDayId(d.id)
        return [d.id, stops[0]?.placeName ?? ''] as [string, string]
      })
    ).then(pairs => setStopNamesByDayId(Object.fromEntries(pairs)))
  }, [days])

  // Budget status per date — empty for now until expense data is wired; Plan 3 can improve
  const budgetStatusByDate: Record<string, BudgetStatus> = {}

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={prevMonth}><IonIcon icon={chevronBackOutline} /></IonButton>
          </IonButtons>
          <IonTitle>{MONTH_NAMES[viewMonth]} {viewYear}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={nextMonth}><IonIcon icon={chevronForwardOutline} /></IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <div style={{ display: 'flex', gap: 4, padding: '0 1rem', overflowX: 'auto' }}>
            {(['next10','next20','next30','all'] as FilterMode[]).map(f => (
              <IonButton
                key={f}
                fill={filter === f ? 'solid' : 'outline'}
                size="small"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Whole trip' : `Next ${f.replace('next', '')}`}
              </IonButton>
            ))}
            <IonButton size="small" fill="clear" onClick={() => { setViewYear(new Date().getUTCFullYear()); setViewMonth(new Date().getUTCMonth()) }}>
              Today
            </IonButton>
            {days[0] && (
              <IonButton size="small" fill="clear" onClick={() => {
                const d = new Date(days[0].date + 'T00:00:00Z')
                setViewYear(d.getUTCFullYear()); setViewMonth(d.getUTCMonth())
              }}>
                Trip start
              </IonButton>
            )}
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '0 4px' }}>
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            days={days}
            accommodations={accommodations}
            legs={legs}
            stopNamesByDayId={stopNamesByDayId}
            budgetStatusByDate={budgetStatusByDate}
            highlightRange={highlightRange}
            onDayClick={date => history.push(`/trips/${tripId}/plan`)}
          />
        </div>
      </IonContent>
    </IonPage>
  )
}

export default CalendarPage
```

- [ ] **Step 4: Replace Calendar placeholder in `src/components/TripShell.tsx`**

Replace the `const CalendarPage: React.FC = () => <div>Calendar</div>` line with:
```typescript
import CalendarPage from '../features/calendar/components/CalendarPage'
```
And remove the inline placeholder.

- [ ] **Step 5: Open dev server and verify calendar renders**

```bash
npm run dev
```

Navigate to a trip → Calendar tab. Grid should show month view with trip days highlighted.

- [ ] **Step 6: Commit**

```bash
git add src/features/calendar/ src/components/TripShell.tsx
git commit -m "feat: calendar tab — hybrid monthly grid with accommodation bars and filter buttons"
```

---

## Task 8: Expenses view

**Files:**
- Create: `src/features/expenses/hooks/useExpenses.ts`
- Create: `src/features/expenses/components/BudgetBar.tsx`
- Create: `src/features/expenses/components/ExpenseFormModal.tsx`
- Create: `src/features/expenses/components/ExpensesPage.tsx`
- Modify: `src/components/TripShell.tsx`

- [ ] **Step 1: Write `src/features/expenses/hooks/useExpenses.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'

export function useExpenses(tripId: string) {
  const expenses = useLiveQuery(
    () => db.expenses.where('tripId').equals(tripId).reverse().sortBy('date'),
    [tripId]
  ) ?? []
  const categories = ExpenseCategoryRepository.useAll() ?? []
  return { expenses, categories }
}
```

- [ ] **Step 2: Write `src/features/expenses/components/BudgetBar.tsx`**

```typescript
import type { Trip } from '../../../db/schema'
import { getDailyBudgetStatus, getTotalBudgetStatus, STATUS_COLORS } from '../../../lib/budget'

interface Props {
  trip: Trip
  totalSpent: number
}

const BudgetBar: React.FC<Props> = ({ trip, totalSpent }) => {
  const today = new Date().toISOString().slice(0, 10)
  const start = new Date(trip.startDate + 'T00:00:00Z')
  const end = new Date(trip.endDate + 'T00:00:00Z')
  const now = new Date(today + 'T00:00:00Z')
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1)
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1

  if (!trip.budget.dailyAmount && !trip.budget.total) return null

  return (
    <div style={{ padding: '0.75rem 1rem' }}>
      {trip.budget.dailyAmount && (() => {
        const status = getDailyBudgetStatus(totalSpent, trip.budget.dailyAmount, daysElapsed)
        const cumulative = trip.budget.dailyAmount * daysElapsed
        const pct = Math.min(100, (totalSpent / cumulative) * 100)
        return (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
              <span>Daily budget</span>
              <span style={{ color: STATUS_COLORS[status] }}>{totalSpent.toFixed(0)} / {cumulative.toFixed(0)} {trip.defaultCurrency}</span>
            </div>
            <div style={{ height: 6, background: 'var(--ion-color-light-shade)', borderRadius: 3 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: STATUS_COLORS[status], borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )
      })()}
      {trip.budget.total && (() => {
        const status = getTotalBudgetStatus(totalSpent, trip.budget.total, daysElapsed, totalDays)
        const pct = Math.min(100, (totalSpent / trip.budget.total) * 100)
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
              <span>Total budget</span>
              <span style={{ color: STATUS_COLORS[status] }}>{totalSpent.toFixed(0)} / {trip.budget.total} {trip.defaultCurrency}</span>
            </div>
            <div style={{ height: 6, background: 'var(--ion-color-light-shade)', borderRadius: 3 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: STATUS_COLORS[status], borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default BudgetBar
```

- [ ] **Step 3: Write `src/features/expenses/components/ExpenseFormModal.tsx`**

```typescript
import { useState, useEffect } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/react'
import { ExpenseRepository } from '../../../db/repositories/ExpenseRepository'
import type { Expense, ExpenseCategory } from '../../../db/schema'
import { getExchangeRates, convertAmount } from '../../../lib/currency'

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CHF', 'AUD', 'CAD', 'CZK', 'NOK', 'SEK', 'DKK']

interface Props {
  isOpen: boolean
  onDismiss: () => void
  tripId: string
  tripCurrency: string
  categories: ExpenseCategory[]
  expense?: Expense
}

const ExpenseFormModal: React.FC<Props> = ({
  isOpen, onDismiss, tripId, tripCurrency, categories, expense,
}) => {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(tripCurrency)
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount)); setCurrency(expense.currency)
      setCategoryId(expense.categoryId); setDate(expense.date); setNote(expense.note ?? '')
    } else {
      setAmount(''); setCurrency(tripCurrency); setCategoryId(categories[0]?.id ?? '')
      setDate(new Date().toISOString().slice(0, 10)); setNote('')
    }
  }, [expense, isOpen, tripCurrency, categories])

  useEffect(() => {
    const n = parseFloat(amount)
    if (!n || currency === tripCurrency) { setPreview(null); return }
    getExchangeRates().then(({ rates }) => {
      setPreview(`≈ ${convertAmount(n, currency, tripCurrency, rates).toFixed(2)} ${tripCurrency}`)
    }).catch(() => setPreview(null))
  }, [amount, currency, tripCurrency])

  async function handleSave() {
    const n = parseFloat(amount)
    if (!n || !categoryId) return
    if (expense) {
      await ExpenseRepository.update(expense.id, { amount: n, currency, categoryId, date, note: note || undefined })
    } else {
      await ExpenseRepository.create({ tripId, categoryId, amount: n, currency, date, note: note || undefined })
    }
    onDismiss()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onDismiss}>Cancel</IonButton></IonButtons>
          <IonTitle>{expense ? 'Edit Expense' : 'Add Expense'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={handleSave} disabled={!parseFloat(amount) || !categoryId}>Save</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Amount *</IonLabel>
          <IonInput type="number" value={amount} onIonInput={e => setAmount(e.detail.value ?? '')} placeholder="0.00" />
          {preview && <p style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)', margin: '4px 0 0' }}>{preview}</p>}
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Currency</IonLabel>
          <IonSelect value={currency} onIonChange={e => setCurrency(e.detail.value)}>
            {COMMON_CURRENCIES.map(c => <IonSelectOption key={c} value={c}>{c}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Category *</IonLabel>
          <IonSelect value={categoryId} onIonChange={e => setCategoryId(e.detail.value)}>
            {categories.map(c => <IonSelectOption key={c.id} value={c.id}>{c.icon} {c.label}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Date</IonLabel>
          <IonInput type="date" value={date} onIonInput={e => setDate(e.detail.value ?? '')} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Note</IonLabel>
          <IonInput value={note} onIonInput={e => setNote(e.detail.value ?? '')} placeholder="Optional note..." />
        </IonItem>
      </IonContent>
    </IonModal>
  )
}

export default ExpenseFormModal
```

- [ ] **Step 4: Write `src/features/expenses/components/ExpensesPage.tsx`**

```typescript
import { useState, useEffect } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFab, IonFabButton, IonIcon, IonItem, IonLabel, IonList, IonBadge, IonButton, IonButtons,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import { useParams } from 'react-router-dom'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { ExpenseRepository } from '../../../db/repositories/ExpenseRepository'
import { useExpenses } from '../hooks/useExpenses'
import BudgetBar from './BudgetBar'
import ExpenseFormModal from './ExpenseFormModal'
import type { Expense } from '../../../db/schema'

const ExpensesPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const trip = TripRepository.useById(tripId)
  const { expenses, categories } = useExpenses(tripId)
  const [totalSpent, setTotalSpent] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | undefined>()

  useEffect(() => {
    ExpenseRepository.getTotalConverted(tripId).then(setTotalSpent)
  }, [expenses, tripId])

  if (!trip) return null

  // Group expenses by date
  const byDate = expenses.reduce<Record<string, typeof expenses>>((acc, e) => {
    acc[e.date] = [...(acc[e.date] ?? []), e]
    return acc
  }, {})

  const categoryById = Object.fromEntries(categories.map(c => [c.id, c]))

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Expenses</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent>
        <BudgetBar trip={trip} totalSpent={totalSpent} />
        {expenses.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--ion-color-medium)' }}>No expenses yet</p>
        )}
        {Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => (
          <div key={date}>
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ion-color-medium)' }}>
              {new Date(date + 'T00:00:00Z').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <IonList>
              {items.map(e => {
                const cat = categoryById[e.categoryId]
                return (
                  <IonItem key={e.id} button onClick={() => { setEditExpense(e); setShowForm(true) }}>
                    <span slot="start" style={{ fontSize: '1.2rem' }}>{cat?.icon ?? '💰'}</span>
                    <IonLabel>
                      <h3>{cat?.label ?? 'Expense'}</h3>
                      {e.note && <p>{e.note}</p>}
                    </IonLabel>
                    <div slot="end" style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{e.amount.toFixed(2)} {e.currency}</div>
                      {e.currency !== trip.defaultCurrency && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>
                          {e.amountConverted.toFixed(2)} {trip.defaultCurrency}
                        </div>
                      )}
                    </div>
                  </IonItem>
                )
              })}
            </IonList>
          </div>
        ))}
      </IonContent>
      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => { setEditExpense(undefined); setShowForm(true) }}>
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>
      <ExpenseFormModal
        isOpen={showForm}
        onDismiss={() => { setShowForm(false); setEditExpense(undefined) }}
        tripId={tripId}
        tripCurrency={trip.defaultCurrency}
        categories={categories}
        expense={editExpense}
      />
    </IonPage>
  )
}

export default ExpensesPage
```

- [ ] **Step 5: Replace Expenses placeholder in `src/components/TripShell.tsx`**

```typescript
import ExpensesPage from '../features/expenses/components/ExpensesPage'
```

- [ ] **Step 6: Open dev server and verify expenses work**

```bash
npm run dev
```

Navigate to a trip → Expenses tab. Add an expense in a foreign currency — converted amount should appear.

- [ ] **Step 7: Commit**

```bash
git add src/features/expenses/ src/components/TripShell.tsx
git commit -m "feat: expenses tab — multi-currency logging, budget bars, category grouping"
```

---

## Task 9: Packing list view

**Files:**
- Create: `src/features/packing/hooks/usePacking.ts`
- Create: `src/features/packing/components/PackingItemRow.tsx`
- Create: `src/features/packing/components/PackingPage.tsx`
- Modify: `src/components/TripShell.tsx`

- [ ] **Step 1: Write `src/features/packing/hooks/usePacking.ts`**

```typescript
import { PackingRepository } from '../../../db/repositories/PackingRepository'
export function usePacking(tripId: string) {
  return { items: PackingRepository.useByTripId(tripId) ?? [] }
}
```

- [ ] **Step 2: Write `src/features/packing/components/PackingItemRow.tsx`**

```typescript
import { IonIcon, IonButton } from '@ionic/react'
import { trashOutline } from 'ionicons/icons'
import type { PackingItem } from '../../../db/schema'
import { PackingRepository } from '../../../db/repositories/PackingRepository'

interface Props { item: PackingItem }

const PackingItemRow: React.FC<Props> = ({ item }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0.6rem 1rem',
    opacity: item.checked ? 0.45 : 1,
    borderBottom: '1px solid var(--ion-color-light-shade)',
  }}>
    <input
      type="checkbox"
      checked={item.checked}
      onChange={() => PackingRepository.toggleChecked(item.id)}
      style={{ width: 18, height: 18, flexShrink: 0 }}
    />
    <span style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none' }}>
      {item.label}
    </span>
    {item.weightGrams && (
      <span style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>
        {item.weightGrams}g
      </span>
    )}
    <IonButton fill="clear" size="small" color="danger" onClick={() => PackingRepository.delete(item.id)}>
      <IonIcon icon={trashOutline} />
    </IonButton>
  </div>
)

export default PackingItemRow
```

- [ ] **Step 3: Write `src/features/packing/components/PackingPage.tsx`**

```typescript
import { useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFab, IonFabButton, IonIcon, IonModal, IonButtons, IonButton,
  IonItem, IonLabel, IonInput,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import { useParams } from 'react-router-dom'
import { usePacking } from '../hooks/usePacking'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { PackingRepository } from '../../../db/repositories/PackingRepository'
import PackingItemRow from './PackingItemRow'

const PackingPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { items } = usePacking(tripId)
  const trips = TripRepository.useAll() ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const [weight, setWeight] = useState('')

  const totalGrams = items.reduce((s, i) => s + (i.weightGrams ?? 0), 0)
  const checkedCount = items.filter(i => i.checked).length

  async function handleAdd() {
    if (!label.trim()) return
    await PackingRepository.create({
      tripId, label: label.trim(), checked: false,
      order: items.length,
      weightGrams: parseInt(weight) || undefined,
    })
    setLabel(''); setWeight(''); setShowAdd(false)
  }

  async function handleCopyFromTrip(sourceTripId: string) {
    await PackingRepository.copyFromTrip(sourceTripId, tripId)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Packing</IonTitle>
          <IonButtons slot="end">
            {trips.filter(t => t.id !== tripId && items.length === 0).length > 0 && (
              <IonButton onClick={() => {
                const other = trips.find(t => t.id !== tripId)
                if (other) handleCopyFromTrip(other.id)
              }}>
                Copy from trip
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {items.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--ion-color-medium)' }}>No items yet</p>
        )}
        {items.map(item => <PackingItemRow key={item.id} item={item} />)}
        <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--ion-color-medium)', textAlign: 'right' }}>
          {checkedCount}/{items.length} packed · {(totalGrams / 1000).toFixed(1)} kg total
        </div>
      </IonContent>
      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => setShowAdd(true)}><IonIcon icon={add} /></IonFabButton>
      </IonFab>
      <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)} breakpoints={[0, 0.4]} initialBreakpoint={0.4}>
        <IonHeader><IonToolbar>
          <IonTitle>Add item</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={handleAdd} disabled={!label.trim()}>Add</IonButton></IonButtons>
        </IonToolbar></IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Item name *</IonLabel>
            <IonInput value={label} onIonInput={e => setLabel(e.detail.value ?? '')} placeholder="e.g. Passport" autoFocus />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Weight (grams)</IonLabel>
            <IonInput type="number" value={weight} onIonInput={e => setWeight(e.detail.value ?? '')} placeholder="optional" />
          </IonItem>
        </IonContent>
      </IonModal>
    </IonPage>
  )
}

export default PackingPage
```

- [ ] **Step 4: Replace Packing placeholder in `src/components/TripShell.tsx`**

```typescript
import PackingPage from '../features/packing/components/PackingPage'
```

- [ ] **Step 5: Commit**

```bash
git add src/features/packing/ src/components/TripShell.tsx
git commit -m "feat: packing tab — checklist with weight totals and copy-from-trip"
```

---

## Task 10: Map view

**Files:**
- Create: `src/features/map/hooks/useMapData.ts`
- Create: `src/features/map/components/MapPage.tsx`
- Modify: `src/components/TripShell.tsx`

- [ ] **Step 1: Install Leaflet**

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

- [ ] **Step 2: Add Leaflet CSS import to `src/main.tsx`**

```typescript
import 'leaflet/dist/leaflet.css'
```

- [ ] **Step 3: Fix Leaflet default marker icons (Vite asset issue)**

Add to `src/main.tsx` after the Leaflet CSS import:
```typescript
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })
```

- [ ] **Step 4: Write `src/features/map/hooks/useMapData.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'

export function useMapData(tripId: string) {
  const stopsWithCoords = useLiveQuery(async () => {
    const days = await db.days.where('tripId').equals(tripId).toArray()
    const dayIds = days.map(d => d.id)
    const stops = dayIds.length
      ? await db.stops.where('dayId').anyOf(dayIds).toArray()
      : []
    return stops.filter(s => s.lat !== undefined && s.lng !== undefined)
  }, [tripId]) ?? []

  const unpinnedStops = useLiveQuery(async () => {
    const days = await db.days.where('tripId').equals(tripId).toArray()
    const dayIds = days.map(d => d.id)
    const stops = dayIds.length
      ? await db.stops.where('dayId').anyOf(dayIds).toArray()
      : []
    return stops.filter(s => s.lat === undefined)
  }, [tripId]) ?? []

  const legs = useLiveQuery(
    () => db.transportLegs.where('tripId').equals(tripId).toArray(),
    [tripId]
  ) ?? []

  return { stopsWithCoords, unpinnedStops, legs }
}
```

- [ ] **Step 5: Write `src/features/map/components/MapPage.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel } from '@ionic/react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { useParams } from 'react-router-dom'
import { useMapData } from '../hooks/useMapData'
import { db } from '../../../db/db'
import { fetchRoadRoute, greatCircleArc } from '../../../lib/routing'
import type { Stop, TransportLeg } from '../../../db/schema'

const LINE_COLOR: Record<string, string> = {
  booked_paid: '#27ae60', booked: '#f39c12', not_booked: '#e74c3c',
}

interface RouteSegment {
  points: [number, number][]
  status: TransportLeg['status']
  dashed: boolean
}

const MapPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { stopsWithCoords, unpinnedStops, legs } = useMapData(tripId)
  const [routes, setRoutes] = useState<RouteSegment[]>([])

  // Build route segments for all legs that connect two pinned stops
  useEffect(() => {
    if (!legs.length || !stopsWithCoords.length) { setRoutes([]); return }
    const stopById = new Map(stopsWithCoords.map(s => [s.id, s]))

    async function buildRoutes() {
      const segments: RouteSegment[] = []
      for (const leg of legs) {
        const from = stopById.get(leg.fromStopId)
        const to = stopById.get(leg.toStopId)
        if (!from || !to) continue
        const fromCoord = { lat: from.lat!, lng: from.lng! }
        const toCoord = { lat: to.lat!, lng: to.lng! }
        let points: [number, number][]
        let dashed = false
        try {
          if (leg.method === 'car' || leg.method === 'bus') {
            points = await fetchRoadRoute(fromCoord, toCoord)
          } else if (leg.method === 'plane') {
            points = greatCircleArc(fromCoord, toCoord)
            dashed = true
          } else {
            points = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]]
            dashed = leg.method !== 'train'
          }
        } catch {
          // OSRM failed — fall back to straight line
          points = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]]
          dashed = true
        }
        segments.push({ points, status: leg.status, dashed })
      }
      setRoutes(segments)
    }
    buildRoutes()
  }, [legs, stopsWithCoords])

  const center: [number, number] = stopsWithCoords.length
    ? [stopsWithCoords[0].lat!, stopsWithCoords[0].lng!]
    : [20, 0]

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Map</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <div style={{ height: unpinnedStops.length ? 'calc(100% - 120px)' : '100%' }}>
          <MapContainer center={center} zoom={stopsWithCoords.length ? 6 : 2} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {stopsWithCoords.map(stop => (
              <Marker key={stop.id} position={[stop.lat!, stop.lng!]}>
                <Popup>{stop.placeName}</Popup>
              </Marker>
            ))}
            {routes.map((route, i) => (
              <Polyline
                key={i}
                positions={route.points}
                color={LINE_COLOR[route.status]}
                dashArray={route.dashed ? '6 6' : undefined}
                weight={2.5}
                opacity={route.status === 'not_booked' ? 0.5 : 1}
              />
            ))}
          </MapContainer>
        </div>
        {unpinnedStops.length > 0 && (
          <IonList style={{ borderTop: '1px solid var(--ion-color-light-shade)' }}>
            <IonItem>
              <IonLabel><h3 style={{ fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>Not pinned on map</h3></IonLabel>
            </IonItem>
            {unpinnedStops.map(s => (
              <IonItem key={s.id}>
                <IonLabel>📍 {s.placeName}</IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  )
}

export default MapPage
```

- [ ] **Step 6: Replace Map placeholder in `src/components/TripShell.tsx`**

```typescript
import MapPage from '../features/map/components/MapPage'
```

- [ ] **Step 7: Open dev server and verify map renders**

```bash
npm run dev
```

Navigate to a trip with pinned stops → Map tab. Markers should appear and route lines connect them.

- [ ] **Step 8: Commit**

```bash
git add src/features/map/ src/components/TripShell.tsx src/main.tsx
git commit -m "feat: map tab — Leaflet + OSM tiles, stop markers, OSRM/arc routing, unpinned list"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run all tests**

```bash
npm run test:run
```

Expected: all tests PASS (Plans 1 + 2 combined).

- [ ] **Step 2: Build for production**

```bash
npm run build
```

Expected: TypeScript clean, no errors.

- [ ] **Step 3: Manual smoke test — all 5 tabs**

```bash
npm run dev
```

- Plan tab: add stops, transport, accommodation — all working from Plan 1
- Calendar tab: shows monthly grid, accommodation color dots, trip days highlighted
- Expenses tab: add expense in USD → see PLN conversion; budget bar visible if budget set
- Packing tab: add items, check them off, see weight total
- Map tab: pinned stops appear as markers; route lines connect stops with transport legs

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: views complete — calendar, expenses, packing, map (build steps 4–8)"
```
