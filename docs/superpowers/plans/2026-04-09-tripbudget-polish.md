# TripBudget Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the app with Trip Summary screen, Global Settings (expense category management), JSON Export/Import, Google Drive sync (single-user, no conflict resolution), and PWA polish (install prompt, offline handling, Workbox caching).

**Architecture:** Same repository layer as Plans 1–2. New additions: `SettingsRepository`, `sync/` layer (SyncManager + GoogleDriveSync), export/import utilities. All sync logic is isolated in `src/sync/` so it never touches UI components directly.

**Tech Stack:** React 18 + TypeScript + Ionic React, Dexie.js, Google Drive API (drive.file scope, OAuth2 via GIS), vite-plugin-pwa (Workbox), Vitest

**Covers:** Build steps 9–13. Requires Plans 1 and 2 complete first.

---

## File Map

```
src/
├── db/repositories/
│   └── SettingsRepository.ts
├── lib/
│   └── exportImport.ts                        # JSON serialise/deserialise all trip data
├── sync/
│   ├── GoogleDriveSync.ts                     # Drive API client (upload/download per trip)
│   └── SyncManager.ts                         # Debounce logic, status state, visibilitychange hook
├── hooks/
│   └── useSyncStatus.ts                       # Exposes sync status to header
├── components/
│   └── SyncStatusBadge.tsx                    # Header indicator (✅ / 🔄 / ⚠️ / 🔴)
└── features/
    ├── summary/components/
    │   └── SummaryPage.tsx
    └── settings/components/
        ├── SettingsPage.tsx                   # Replaces placeholder from Plan 1
        ├── CategoryEditor.tsx
        └── DataManagementSection.tsx
```

---

## Task 1: SettingsRepository

**Files:**
- Create: `src/db/repositories/SettingsRepository.ts`
- Create: `src/db/repositories/__tests__/SettingsRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/db/repositories/__tests__/SettingsRepository.test.ts
import { beforeEach, describe, it, expect } from 'vitest'
import { db } from '../../db'
import { SettingsRepository } from '../SettingsRepository'

beforeEach(async () => { await db.userSettings.clear() })

describe('SettingsRepository.get', () => {
  it('returns defaults when no settings exist', async () => {
    const s = await SettingsRepository.get()
    expect(s.firstDayOfWeek).toBe('monday')
    expect(s.googleConnected).toBe(false)
    expect(s.syncCondition).toBe('wifi')
  })
})

describe('SettingsRepository.update', () => {
  it('persists partial updates', async () => {
    await SettingsRepository.update({ firstDayOfWeek: 'sunday' })
    const s = await SettingsRepository.get()
    expect(s.firstDayOfWeek).toBe('sunday')
    expect(s.googleConnected).toBe(false) // unchanged
  })

  it('merges multiple updates', async () => {
    await SettingsRepository.update({ firstDayOfWeek: 'sunday' })
    await SettingsRepository.update({ googleConnected: true })
    const s = await SettingsRepository.get()
    expect(s.firstDayOfWeek).toBe('sunday')
    expect(s.googleConnected).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- SettingsRepository
```

Expected: FAIL — `SettingsRepository` not found.

- [ ] **Step 3: Write `src/db/repositories/SettingsRepository.ts`**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { UserSettings } from '../schema'

const DEFAULTS: UserSettings = {
  id: 'singleton',
  firstDayOfWeek: 'monday',
  syncCondition: 'wifi',
  googleConnected: false,
}

export const SettingsRepository = {
  use() {
    return useLiveQuery(() => SettingsRepository.get(), [])
  },

  async get(): Promise<UserSettings> {
    const s = await db.userSettings.get('singleton')
    return s ?? { ...DEFAULTS }
  },

  async update(updates: Partial<Omit<UserSettings, 'id'>>): Promise<void> {
    const current = await SettingsRepository.get()
    await db.userSettings.put({ ...current, ...updates, id: 'singleton' })
  },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- SettingsRepository
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/SettingsRepository.ts src/db/repositories/__tests__/SettingsRepository.test.ts
git commit -m "feat: SettingsRepository — singleton upsert with defaults"
```

---

## Task 2: Export/Import lib

**Files:**
- Create: `src/lib/exportImport.ts`
- Create: `src/lib/__tests__/exportImport.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/exportImport.test.ts
import { beforeEach, describe, it, expect } from 'vitest'
import { db } from '../../db/db'
import { exportTrip, importTrip, exportAll, importAll } from '../exportImport'
import { TripRepository } from '../../db/repositories/TripRepository'

beforeEach(async () => {
  await Promise.all([
    db.trips.clear(), db.days.clear(), db.stops.clear(),
    db.transportLegs.clear(), db.accommodations.clear(),
    db.expenses.clear(), db.packingItems.clear(),
  ])
})

describe('exportTrip / importTrip round-trip', () => {
  it('exports and re-imports a trip with all its days', async () => {
    const id = await TripRepository.create({
      name: 'Test', destination: 'Paris', emoji: '🇫🇷', coverColor: '#fff',
      startDate: '2026-07-01', endDate: '2026-07-02', defaultCurrency: 'EUR', budget: {},
    })
    const json = await exportTrip(id)
    const data = JSON.parse(json)
    expect(data.trip.name).toBe('Test')
    expect(data.days).toHaveLength(2)

    // Clear and re-import
    await db.trips.clear(); await db.days.clear()
    await importTrip(json, 'replace')
    const trips = await db.trips.toArray()
    expect(trips).toHaveLength(1)
    expect(trips[0].name).toBe('Test')
    const days = await db.days.where('tripId').equals(id).toArray()
    expect(days).toHaveLength(2)
  })
})

describe('exportAll / importAll round-trip', () => {
  it('preserves all trips and expense categories', async () => {
    await db.expenseCategories.add({ id: 'cat1', label: 'Food', color: '#fff', icon: '🍕' })
    await TripRepository.create({
      name: 'Trip A', destination: 'D', emoji: '✈️', coverColor: '#fff',
      startDate: '2026-07-01', endDate: '2026-07-01', defaultCurrency: 'EUR', budget: {},
    })
    const json = await exportAll()
    await Promise.all([db.trips.clear(), db.days.clear(), db.expenseCategories.clear()])
    await importAll(json, 'replace')
    expect(await db.trips.count()).toBe(1)
    expect(await db.expenseCategories.count()).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- exportImport
```

- [ ] **Step 3: Write `src/lib/exportImport.ts`**

```typescript
import { db } from '../db/db'
import type { Trip, Day, Stop, TransportLeg, Accommodation, Expense, PackingItem, ExpenseCategory } from '../db/schema'

interface TripBundle {
  version: 1
  exportedAt: string
  trip: Trip
  days: Day[]
  stops: Stop[]
  transportLegs: TransportLeg[]
  accommodations: Accommodation[]
  expenses: Expense[]
  packingItems: PackingItem[]
}

interface FullBundle {
  version: 1
  exportedAt: string
  trips: TripBundle[]
  expenseCategories: ExpenseCategory[]
}

export async function exportTrip(tripId: string): Promise<string> {
  const trip = await db.trips.get(tripId)
  if (!trip) throw new Error(`Trip ${tripId} not found`)
  const days = await db.days.where('tripId').equals(tripId).toArray()
  const dayIds = days.map(d => d.id)
  const [stops, transportLegs, accommodations, expenses, packingItems] = await Promise.all([
    dayIds.length ? db.stops.where('dayId').anyOf(dayIds).toArray() : [],
    db.transportLegs.where('tripId').equals(tripId).toArray(),
    db.accommodations.where('tripId').equals(tripId).toArray(),
    db.expenses.where('tripId').equals(tripId).toArray(),
    db.packingItems.where('tripId').equals(tripId).toArray(),
  ])
  const bundle: TripBundle = {
    version: 1, exportedAt: new Date().toISOString(),
    trip, days, stops, transportLegs, accommodations, expenses, packingItems,
  }
  return JSON.stringify(bundle, null, 2)
}

export async function importTrip(json: string, mode: 'replace' | 'merge'): Promise<void> {
  const bundle: TripBundle = JSON.parse(json)
  if (bundle.version !== 1) throw new Error('Unsupported bundle version')
  await db.transaction('rw', [db.trips, db.days, db.stops, db.transportLegs, db.accommodations, db.expenses, db.packingItems], async () => {
    if (mode === 'replace') {
      await db.trips.put(bundle.trip)
      const existingDays = await db.days.where('tripId').equals(bundle.trip.id).toArray()
      if (existingDays.length) await db.stops.where('dayId').anyOf(existingDays.map(d => d.id)).delete()
      await db.days.where('tripId').equals(bundle.trip.id).delete()
      await db.transportLegs.where('tripId').equals(bundle.trip.id).delete()
      await db.accommodations.where('tripId').equals(bundle.trip.id).delete()
      await db.expenses.where('tripId').equals(bundle.trip.id).delete()
      await db.packingItems.where('tripId').equals(bundle.trip.id).delete()
    }
    await db.days.bulkPut(bundle.days)
    await db.stops.bulkPut(bundle.stops)
    await db.transportLegs.bulkPut(bundle.transportLegs)
    await db.accommodations.bulkPut(bundle.accommodations)
    await db.expenses.bulkPut(bundle.expenses)
    await db.packingItems.bulkPut(bundle.packingItems)
  })
}

export async function exportAll(): Promise<string> {
  const trips = await db.trips.toArray()
  const expenseCategories = await db.expenseCategories.toArray()
  const tripBundles: TripBundle[] = await Promise.all(
    trips.map(async t => JSON.parse(await exportTrip(t.id)))
  )
  const bundle: FullBundle = {
    version: 1, exportedAt: new Date().toISOString(),
    trips: tripBundles, expenseCategories,
  }
  return JSON.stringify(bundle, null, 2)
}

export async function importAll(json: string, mode: 'replace' | 'merge'): Promise<void> {
  const bundle: FullBundle = JSON.parse(json)
  if (bundle.version !== 1) throw new Error('Unsupported bundle version')
  if (mode === 'replace') {
    await Promise.all([
      db.trips.clear(), db.days.clear(), db.stops.clear(),
      db.transportLegs.clear(), db.accommodations.clear(),
      db.expenses.clear(), db.packingItems.clear(), db.expenseCategories.clear(),
    ])
  }
  await db.expenseCategories.bulkPut(bundle.expenseCategories)
  for (const tripBundle of bundle.trips) {
    await importTrip(JSON.stringify(tripBundle), 'merge')
    await db.trips.put(tripBundle.trip)
  }
}

/** Trigger a browser file download of the JSON string. */
export function downloadJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/** Read a JSON file chosen by the user. Returns the file contents as a string. */
export function readJsonFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error('No file selected'))
      resolve(await file.text())
    }
    input.click()
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- exportImport
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exportImport.ts src/lib/__tests__/exportImport.test.ts
git commit -m "feat: export/import lib — full JSON round-trip for single trip and all trips"
```

---

## Task 3: Google Drive sync

**Files:**
- Create: `src/sync/GoogleDriveSync.ts`
- Create: `src/sync/SyncManager.ts`
- Create: `src/hooks/useSyncStatus.ts`

Note: Google Identity Services (GIS) loads from a `<script>` tag. Add this to `index.html` before the app script:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

- [ ] **Step 1: Add GIS script to `index.html`**

Open `index.html` and add before `</body>`:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

- [ ] **Step 2: Write `src/sync/GoogleDriveSync.ts`**

```typescript
/**
 * Google Drive API wrapper — drive.file scope only.
 * App creates files under a TripBudget/ folder, can only see its own files.
 *
 * Single-user, no conflict resolution: upload overwrites, download replaces local.
 */

const FOLDER_NAME = 'TripBudget'
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void
}

let tokenClient: TokenClient | null = null
let accessToken: string | null = null

/** Load the GIS token client. Call once on app init if google.accounts is available. */
export function initGoogleAuth(onToken: (token: string) => void): void {
  if (typeof google === 'undefined') return
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp: { access_token?: string; error?: string }) => {
      if (resp.access_token) {
        accessToken = resp.access_token
        onToken(resp.access_token)
      }
    },
  })
}

export function requestSignIn(): void {
  tokenClient?.requestAccessToken({ prompt: 'consent' })
}

export function signOut(): void {
  if (accessToken) google.accounts.oauth2.revoke(accessToken, () => {})
  accessToken = null
}

export function isSignedIn(): boolean {
  return !!accessToken
}

async function driveRequest(path: string, options: RequestInit = {}): Promise<Response> {
  if (!accessToken) throw new Error('Not authenticated')
  return fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers ?? {}) },
  })
}

async function findOrCreateFolder(): Promise<string> {
  const res = await driveRequest(
    `/files?q=name%3D'${FOLDER_NAME}'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+trashed%3Dfalse&fields=files(id)`
  )
  const data = await res.json()
  if (data.files?.length) return data.files[0].id as string
  const createRes = await driveRequest('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const created = await createRes.json()
  return created.id as string
}

async function findFile(folderId: string, filename: string): Promise<string | null> {
  const res = await driveRequest(
    `/files?q=name%3D'${filename}'+and+'${folderId}'+in+parents+and+trashed%3Dfalse&fields=files(id)`
  )
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

export async function uploadFile(filename: string, content: string): Promise<void> {
  const folderId = await findOrCreateFolder()
  const existingId = await findFile(folderId, filename)
  const blob = new Blob([content], { type: 'application/json' })
  const metadata = { name: filename, mimeType: 'application/json', ...(existingId ? {} : { parents: [folderId] }) }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', blob)
  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
  await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
}

export async function downloadFile(filename: string): Promise<string | null> {
  const folderId = await findOrCreateFolder()
  const fileId = await findFile(folderId, filename)
  if (!fileId) return null
  const res = await driveRequest(`/files/${fileId}?alt=media`)
  if (!res.ok) return null
  return res.text()
}

export async function listTripFiles(): Promise<string[]> {
  const folderId = await findOrCreateFolder()
  const res = await driveRequest(
    `/files?q='${folderId}'+in+parents+and+trashed%3Dfalse&fields=files(name)`
  )
  const data = await res.json()
  return (data.files ?? []).map((f: { name: string }) => f.name) as string[]
}
```

- [ ] **Step 3: Write `src/sync/SyncManager.ts`**

```typescript
/**
 * SyncManager — coordinates when and what to sync.
 *
 * Upload: debounced 30s after any data change.
 * Download: on document visibilitychange → visible (app resume).
 * Status: 'synced' | 'syncing' | 'offline' | 'error'
 */
import { exportTrip, exportAll, importAll } from '../lib/exportImport'
import { uploadFile, downloadFile, listTripFiles, isSignedIn } from './GoogleDriveSync'
import { SettingsRepository } from '../db/repositories/SettingsRepository'
import { db } from '../db/db'

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

type Listener = (status: SyncStatus) => void

let status: SyncStatus = 'synced'
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<Listener>()

export function onSyncStatus(fn: Listener): () => void {
  listeners.add(fn)
  fn(status)
  return () => listeners.delete(fn)
}

function setStatus(s: SyncStatus) {
  status = s
  listeners.forEach(fn => fn(s))
}

/** Call after every repository write to trigger debounced upload. */
export function notifyDataChanged(tripId?: string): void {
  if (!isSignedIn()) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => uploadTrip(tripId), 30_000)
}

async function canSync(): Promise<boolean> {
  const settings = await SettingsRepository.get()
  if (settings.syncCondition === 'manual') return false
  if (!navigator.onLine) return false
  if (settings.syncCondition === 'wifi') {
    // navigator.connection is not universally available — best effort
    const conn = (navigator as any).connection
    if (conn && conn.type && conn.type !== 'wifi') return false
  }
  return true
}

export async function uploadTrip(tripId?: string): Promise<void> {
  if (!isSignedIn() || !(await canSync())) return
  setStatus('syncing')
  try {
    if (tripId) {
      const json = await exportTrip(tripId)
      await uploadFile(`trip_${tripId}.json`, json)
    } else {
      const trips = await db.trips.toArray()
      for (const t of trips) {
        const json = await exportTrip(t.id)
        await uploadFile(`trip_${t.id}.json`, json)
      }
    }
    await SettingsRepository.update({ lastSyncedAt: new Date().toISOString() })
    setStatus('synced')
  } catch {
    setStatus(navigator.onLine ? 'error' : 'offline')
  }
}

export async function downloadAll(): Promise<void> {
  if (!isSignedIn() || !(await canSync())) return
  setStatus('syncing')
  try {
    const filenames = await listTripFiles()
    const tripFiles = filenames.filter(f => f.startsWith('trip_') && f.endsWith('.json'))
    for (const filename of tripFiles) {
      const json = await downloadFile(filename)
      if (json) {
        const { importTrip } = await import('../lib/exportImport')
        await importTrip(json, 'replace')
      }
    }
    await SettingsRepository.update({ lastSyncedAt: new Date().toISOString() })
    setStatus('synced')
  } catch {
    setStatus(navigator.onLine ? 'error' : 'offline')
  }
}

/** Wire up app-resume download. Call once at app startup. */
export function startAutoSync(): () => void {
  function handleVisibility() {
    if (document.visibilityState === 'visible') downloadAll()
  }
  if (!navigator.onLine) setStatus('offline')
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('offline', () => setStatus('offline'))
  window.addEventListener('online', () => { if (isSignedIn()) setStatus('synced') })
  return () => {
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}
```

- [ ] **Step 4: Write `src/hooks/useSyncStatus.ts`**

```typescript
import { useEffect, useState } from 'react'
import { onSyncStatus, type SyncStatus } from '../sync/SyncManager'

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>('synced')
  useEffect(() => {
    const unsub = onSyncStatus(setStatus)
    return unsub
  }, [])
  return status
}
```

- [ ] **Step 5: Write `src/components/SyncStatusBadge.tsx`**

```typescript
import { useSyncStatus } from '../hooks/useSyncStatus'
import type { SyncStatus } from '../sync/SyncManager'

const LABELS: Record<SyncStatus, string> = {
  synced: '✅ Synced',
  syncing: '🔄 Syncing',
  offline: '⚠️ Offline',
  error: '🔴 Sync error',
}

const SyncStatusBadge: React.FC = () => {
  const status = useSyncStatus()
  if (status === 'synced') return null  // hide when synced — don't clutter header
  return (
    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.05)' }}>
      {LABELS[status]}
    </span>
  )
}

export default SyncStatusBadge
```

- [ ] **Step 6: Wire `startAutoSync` into `src/main.tsx`**

Add after `setupIonicReact()`:
```typescript
import { startAutoSync } from './sync/SyncManager'
startAutoSync()
```

- [ ] **Step 7: Add `SyncStatusBadge` to `src/App.tsx`**

This is a placeholder location — it goes inside the global header once the design is finalized. For now, add it to the TripsPage header in `src/features/trips/components/TripsPage.tsx`:

In the IonToolbar, add after the title:
```typescript
import SyncStatusBadge from '../../../components/SyncStatusBadge'
// ...
<IonTitle>My Trips <SyncStatusBadge /></IonTitle>
```

- [ ] **Step 8: Add `VITE_GOOGLE_CLIENT_ID` to `.env.local`**

Create `.env.local` (never commit this file):
```
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id-here
```

Add to `.gitignore`:
```
.env.local
```

To get a client ID: Google Cloud Console → Create project → Enable Drive API → OAuth credentials → Web application → add `http://localhost:5173` as authorized origin.

- [ ] **Step 9: Commit**

```bash
git add src/sync/ src/hooks/useSyncStatus.ts src/components/SyncStatusBadge.tsx src/main.tsx .gitignore index.html
git commit -m "feat: Google Drive sync — single-user upload/download, debounced 30s, visibilitychange resume"
```

---

## Task 4: Trip Summary screen

**Files:**
- Create: `src/features/summary/components/SummaryPage.tsx`
- Modify: `src/App.tsx` — add `/trips/:tripId/summary` route

- [ ] **Step 1: Add route to `src/App.tsx`**

Import and add a route for the summary page. In `App.tsx`, inside the `IonRouterOutlet`, add:
```typescript
import SummaryPage from './features/summary/components/SummaryPage'
// ...
<Route exact path="/trips/:tripId/summary" component={SummaryPage} />
```
Add this route before the `<Route path="/trips/:tripId">` route so it matches first.

- [ ] **Step 2: Write `src/features/summary/components/SummaryPage.tsx`**

```typescript
import { useEffect, useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge,
} from '@ionic/react'
import { arrowBackOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { ExpenseRepository } from '../../../db/repositories/ExpenseRepository'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import { PackingRepository } from '../../../db/repositories/PackingRepository'
import { db } from '../../../db/db'
import type { ExpenseCategory } from '../../../db/schema'

const STATUS_COLORS = { not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60' }

const SummaryPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const history = useHistory()
  const trip = TripRepository.useById(tripId)
  const accommodations = AccommodationRepository.useByTripId(tripId) ?? []
  const categories = ExpenseCategoryRepository.useAll() ?? []

  const [totalSpent, setTotalSpent] = useState(0)
  const [spendByCategory, setSpendByCategory] = useState<Record<string, number>>({})
  const [packingStats, setPackingStats] = useState({ total: 0, checked: 0 })
  const [dailyAvg, setDailyAvg] = useState(0)

  useEffect(() => {
    if (!trip) return
    Promise.all([
      ExpenseRepository.getTotalConverted(tripId),
      db.expenses.where('tripId').equals(tripId).toArray(),
      PackingRepository.useByTripId  // can't use hook, fetch directly
        ? db.packingItems.where('tripId').equals(tripId).toArray()
        : Promise.resolve([]),
    ]).then(([total, expenses, items]) => {
      setTotalSpent(total)
      const byCat: Record<string, number> = {}
      expenses.forEach(e => { byCat[e.categoryId] = (byCat[e.categoryId] ?? 0) + e.amountConverted })
      setSpendByCategory(byCat)
      const start = new Date(trip.startDate + 'T00:00:00Z')
      const end = new Date(trip.endDate + 'T00:00:00Z')
      const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
      setDailyAvg(totalDays > 0 ? total / totalDays : 0)
      setPackingStats({ total: items.length, checked: items.filter(i => i.checked).length })
    })
  }, [trip, tripId])

  if (!trip) return null

  const catById = Object.fromEntries(categories.map(c => [c.id, c]))
  const totalDays = Math.floor(
    (new Date(trip.endDate + 'T00:00:00Z').getTime() - new Date(trip.startDate + 'T00:00:00Z').getTime()) / 86400000
  ) + 1

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Trip Summary</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Trip header */}
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '3rem' }}>{trip.emoji}</div>
          <h2 style={{ margin: '0.25rem 0' }}>{trip.name}</h2>
          <p style={{ color: 'var(--ion-color-medium)', margin: 0 }}>
            {trip.destination} · {totalDays} days
          </p>
          <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            {new Date(trip.startDate + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            {' – '}
            {new Date(trip.endDate + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Spend overview */}
        <div style={{ background: 'var(--ion-color-light)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>TOTAL SPEND</h3>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {totalSpent.toFixed(2)} <span style={{ fontSize: '1rem' }}>{trip.defaultCurrency}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ion-color-medium)', marginTop: 4 }}>
            Avg {dailyAvg.toFixed(2)} {trip.defaultCurrency}/day
          </div>
          {trip.budget.total && (
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
              Budget: {trip.budget.total} {trip.defaultCurrency} · {totalSpent > trip.budget.total ? '🔴 over' : '🟢 within'}
            </div>
          )}
        </div>

        {/* Spend by category */}
        {Object.entries(spendByCategory).length > 0 && (
          <>
            <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>BY CATEGORY</h3>
            <IonList>
              {Object.entries(spendByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([catId, amount]) => {
                  const cat = catById[catId]
                  return (
                    <IonItem key={catId}>
                      <span slot="start">{cat?.icon ?? '💰'}</span>
                      <IonLabel>{cat?.label ?? catId}</IonLabel>
                      <span slot="end" style={{ fontWeight: 600 }}>
                        {amount.toFixed(2)} {trip.defaultCurrency}
                      </span>
                    </IonItem>
                  )
                })}
            </IonList>
          </>
        )}

        {/* Accommodations */}
        {accommodations.length > 0 && (
          <>
            <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>ACCOMMODATION</h3>
            <IonList>
              {accommodations.map(a => (
                <IonItem key={a.id}>
                  <IonLabel>
                    <h3>{a.name}</h3>
                    <p>{a.checkIn} → {a.checkOut}</p>
                  </IonLabel>
                  <span slot="end" style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[a.status] }} />
                </IonItem>
              ))}
            </IonList>
          </>
        )}

        {/* Packing */}
        {packingStats.total > 0 && (
          <div style={{ background: 'var(--ion-color-light)', borderRadius: 12, padding: '1rem', margin: '1rem 0' }}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>PACKING</h3>
            <div>{packingStats.checked} / {packingStats.total} items packed</div>
          </div>
        )}
      </IonContent>
    </IonPage>
  )
}

export default SummaryPage
```

- [ ] **Step 3: Wire Summary into the trip ⋯ menu in `src/features/planner/components/PlannerPage.tsx`**

Replace the `<IonButton>` with `<IonIcon icon={ellipsisVertical} />` in PlannerPage with a button that navigates to summary:
```typescript
import { useHistory, useParams } from 'react-router-dom'
// ...
const history = useHistory()
// ...
<IonButton onClick={() => history.push(`/trips/${tripId}/summary`)}>
  <IonIcon icon={ellipsisVertical} />
</IonButton>
```

- [ ] **Step 4: Commit**

```bash
git add src/features/summary/ src/App.tsx src/features/planner/components/PlannerPage.tsx
git commit -m "feat: trip summary screen — spend totals, category breakdown, accommodation status, packing stats"
```

---

## Task 5: Global Settings screen

**Files:**
- Create: `src/features/settings/components/CategoryEditor.tsx`
- Create: `src/features/settings/components/DataManagementSection.tsx`
- Modify: `src/features/settings/components/SettingsPage.tsx` — replace placeholder

- [ ] **Step 1: Write `src/features/settings/components/CategoryEditor.tsx`**

```typescript
import { useState } from 'react'
import {
  IonList, IonItem, IonLabel, IonButton, IonIcon, IonInput,
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent,
} from '@ionic/react'
import { addOutline, pencilOutline, trashOutline } from 'ionicons/icons'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'
import type { ExpenseCategory } from '../../../db/schema'

interface Props { categories: ExpenseCategory[] }

const PRESET_ICONS = ['🏨','🚌','🍕','📦','🎭','🏋️','💊','🛍️','☕','🍷','🎡','⛷️','🤿','📸']

const CategoryEditor: React.FC<Props> = ({ categories }) => {
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#4A90D9')
  const [icon, setIcon] = useState('📦')

  function openEdit(cat: ExpenseCategory) {
    setEditing(cat); setLabel(cat.label); setColor(cat.color); setIcon(cat.icon)
  }

  async function handleSave() {
    if (!label.trim()) return
    if (editing) {
      await ExpenseCategoryRepository.update(editing.id, { label, color, icon })
      setEditing(null)
    } else {
      await ExpenseCategoryRepository.create({ label, color, icon })
      setAdding(false)
    }
    setLabel(''); setColor('#4A90D9'); setIcon('📦')
  }

  const formOpen = !!editing || adding

  return (
    <>
      <IonList>
        {categories.map(cat => (
          <IonItem key={cat.id}>
            <span slot="start" style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
            <IonLabel>
              <h3>{cat.label}</h3>
              <p><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: cat.color, marginRight: 4 }} />{cat.color}</p>
            </IonLabel>
            <IonButton slot="end" fill="clear" onClick={() => openEdit(cat)}>
              <IonIcon icon={pencilOutline} />
            </IonButton>
            <IonButton slot="end" fill="clear" color="danger" onClick={() => ExpenseCategoryRepository.delete(cat.id)}>
              <IonIcon icon={trashOutline} />
            </IonButton>
          </IonItem>
        ))}
        <IonItem button onClick={() => { setAdding(true); setLabel(''); setColor('#4A90D9'); setIcon('📦') }}>
          <IonIcon icon={addOutline} slot="start" />
          <IonLabel>Add category</IonLabel>
        </IonItem>
        <IonItem button onClick={() => ExpenseCategoryRepository.resetToDefaults()}>
          <IonLabel color="medium">Reset to defaults</IonLabel>
        </IonItem>
      </IonList>

      <IonModal isOpen={formOpen} onDidDismiss={() => { setEditing(null); setAdding(false) }}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonButton onClick={() => { setEditing(null); setAdding(false) }}>Cancel</IonButton></IonButtons>
            <IonTitle>{editing ? 'Edit Category' : 'New Category'}</IonTitle>
            <IonButtons slot="end"><IonButton strong onClick={handleSave} disabled={!label.trim()}>Save</IonButton></IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Label</IonLabel>
            <IonInput value={label} onIonInput={e => setLabel(e.detail.value ?? '')} placeholder="e.g. Entertainment" />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Color</IonLabel>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ marginTop: 8, width: 48, height: 32, border: 'none', cursor: 'pointer' }} />
          </IonItem>
          <div style={{ padding: '0.75rem 0' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>Icon</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_ICONS.map(i => (
                <button
                  key={i} onClick={() => setIcon(i)}
                  style={{
                    fontSize: '1.5rem', background: 'none', border: icon === i ? '2px solid var(--ion-color-primary)' : '2px solid transparent',
                    borderRadius: 8, padding: 4, cursor: 'pointer',
                  }}
                >{i}</button>
              ))}
            </div>
          </div>
        </IonContent>
      </IonModal>
    </>
  )
}

export default CategoryEditor
```

- [ ] **Step 2: Write `src/features/settings/components/DataManagementSection.tsx`**

```typescript
import { IonList, IonItem, IonLabel, IonButton, useIonAlert } from '@ionic/react'
import { exportAll, importAll, downloadJson, readJsonFile } from '../../../lib/exportImport'

const DataManagementSection: React.FC = () => {
  const [present] = useIonAlert()

  async function handleExportAll() {
    const json = await exportAll()
    downloadJson(json, `tripbudget-backup-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function handleImport() {
    try {
      const json = await readJsonFile()
      present({
        header: 'Import data',
        message: 'Replace all local data, or merge with existing?',
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Merge', handler: () => importAll(json, 'merge') },
          { text: 'Replace', role: 'destructive', handler: () => importAll(json, 'replace') },
        ],
      })
    } catch {
      // user cancelled file picker — no-op
    }
  }

  async function handleClearAll() {
    present({
      header: 'Clear all data',
      message: 'This will delete all trips and settings from this device. This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete everything', role: 'destructive',
          handler: async () => {
            const { db } = await import('../../../db/db')
            await Promise.all([
              db.trips.clear(), db.days.clear(), db.stops.clear(),
              db.transportLegs.clear(), db.accommodations.clear(),
              db.expenses.clear(), db.packingItems.clear(),
            ])
          },
        },
      ],
    })
  }

  return (
    <IonList>
      <IonItem button onClick={handleExportAll}>
        <IonLabel>Export all data (JSON)</IonLabel>
      </IonItem>
      <IonItem button onClick={handleImport}>
        <IonLabel>Import from JSON</IonLabel>
      </IonItem>
      <IonItem button onClick={handleClearAll}>
        <IonLabel color="danger">Clear all local data</IonLabel>
      </IonItem>
    </IonList>
  )
}

export default DataManagementSection
```

- [ ] **Step 3: Rewrite `src/features/settings/components/SettingsPage.tsx`**

```typescript
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonItem, IonLabel, IonSelect, IonSelectOption, IonList,
} from '@ionic/react'
import { arrowBackOutline } from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { SettingsRepository } from '../../../db/repositories/SettingsRepository'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'
import { requestSignIn, signOut, isSignedIn } from '../../../sync/GoogleDriveSync'
import { uploadTrip } from '../../../sync/SyncManager'
import CategoryEditor from './CategoryEditor'
import DataManagementSection from './DataManagementSection'

const SettingsPage: React.FC = () => {
  const history = useHistory()
  const settings = SettingsRepository.use()
  const categories = ExpenseCategoryRepository.useAll() ?? []

  if (!settings) return null

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {/* Account & Sync */}
        <div style={{ padding: '1rem 1rem 0', fontSize: '0.75rem', color: 'var(--ion-color-medium)', fontWeight: 600, letterSpacing: 1 }}>
          ACCOUNT & SYNC
        </div>
        <IonList>
          <IonItem>
            <IonLabel>{settings.googleConnected ? 'Google Drive connected' : 'Google Drive'}</IonLabel>
            {settings.googleConnected
              ? <IonButton slot="end" fill="outline" color="danger" onClick={async () => { signOut(); await SettingsRepository.update({ googleConnected: false }) }}>Sign out</IonButton>
              : <IonButton slot="end" fill="outline" onClick={() => requestSignIn()}>Sign in</IonButton>
            }
          </IonItem>
          {settings.lastSyncedAt && (
            <IonItem>
              <IonLabel color="medium">Last synced: {new Date(settings.lastSyncedAt).toLocaleString()}</IonLabel>
            </IonItem>
          )}
          <IonItem>
            <IonLabel position="stacked">Sync over</IonLabel>
            <IonSelect
              value={settings.syncCondition}
              onIonChange={e => SettingsRepository.update({ syncCondition: e.detail.value })}
              disabled={!settings.googleConnected}
            >
              <IonSelectOption value="wifi">Wi-Fi only</IonSelectOption>
              <IonSelectOption value="wifi_and_mobile">Wi-Fi + mobile data</IonSelectOption>
              <IonSelectOption value="manual">Manual only</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem button onClick={() => uploadTrip()} disabled={!settings.googleConnected}>
            <IonLabel>Sync now</IonLabel>
          </IonItem>
        </IonList>

        {/* Preferences */}
        <div style={{ padding: '1rem 1rem 0', fontSize: '0.75rem', color: 'var(--ion-color-medium)', fontWeight: 600, letterSpacing: 1 }}>
          PREFERENCES
        </div>
        <IonList>
          <IonItem>
            <IonLabel position="stacked">First day of week</IonLabel>
            <IonSelect
              value={settings.firstDayOfWeek}
              onIonChange={e => SettingsRepository.update({ firstDayOfWeek: e.detail.value })}
            >
              <IonSelectOption value="monday">Monday</IonSelectOption>
              <IonSelectOption value="sunday">Sunday</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        {/* Expense Categories */}
        <div style={{ padding: '1rem 1rem 0', fontSize: '0.75rem', color: 'var(--ion-color-medium)', fontWeight: 600, letterSpacing: 1 }}>
          EXPENSE CATEGORIES
        </div>
        <CategoryEditor categories={categories} />

        {/* Data Management */}
        <div style={{ padding: '1rem 1rem 0', fontSize: '0.75rem', color: 'var(--ion-color-medium)', fontWeight: 600, letterSpacing: 1 }}>
          DATA MANAGEMENT
        </div>
        <DataManagementSection />

        {/* App info */}
        <div style={{ padding: '1rem 1rem 0', fontSize: '0.75rem', color: 'var(--ion-color-medium)', fontWeight: 600, letterSpacing: 1 }}>
          APP
        </div>
        <IonList>
          <IonItem>
            <IonLabel color="medium">Theme</IonLabel>
            <span slot="end" style={{ fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>Follows system</span>
          </IonItem>
          <IonItem>
            <IonLabel color="medium">Version</IonLabel>
            <span slot="end" style={{ fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>1.0.0</span>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  )
}

export default SettingsPage
```

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/ src/db/repositories/SettingsRepository.ts
git commit -m "feat: settings screen — categories editor, export/import, sync config, Google Drive"
```

---

## Task 6: PWA polish

**Files:**
- Modify: `vite.config.ts` — expand Workbox config
- Modify: `src/main.tsx` — register service worker, request persistent storage
- Create: `public/icon-192.png` and `public/icon-512.png` (placeholder icons)

- [ ] **Step 1: Generate placeholder PWA icons**

```bash
# Create a simple placeholder SVG icon and convert — or use any 192px and 512px PNG
# Quick option using ImageMagick if available:
convert -size 192x192 xc:#3880ff -fill white -gravity center -pointsize 60 -annotate 0 "TB" public/icon-192.png
convert -size 512x512 xc:#3880ff -fill white -gravity center -pointsize 160 -annotate 0 "TB" public/icon-512.png
```

If ImageMagick is not available, copy any 192×192 and 512×512 PNG into `public/` named `icon-192.png` and `icon-512.png`.

- [ ] **Step 2: Expand Workbox config in `vite.config.ts`**

Replace the existing `VitePWA({...})` block with:
```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        // OpenStreetMap tiles — cache-first, limit 500 entries
        urlPattern: /^https:\/\/[a-z]+\.tile\.openstreetmap\.org\//,
        handler: 'CacheFirst',
        options: {
          cacheName: 'osm-tiles',
          expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        // Frankfurter API — network-first, fall back to cache
        urlPattern: /^https:\/\/api\.frankfurter\.app\//,
        handler: 'NetworkFirst',
        options: { cacheName: 'frankfurter-rates', networkTimeoutSeconds: 5 },
      },
      {
        // Nominatim — network-first
        urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\//,
        handler: 'NetworkFirst',
        options: { cacheName: 'nominatim', networkTimeoutSeconds: 5 },
      },
      {
        // OSRM — network-first
        urlPattern: /^https:\/\/router\.project-osrm\.org\//,
        handler: 'NetworkFirst',
        options: { cacheName: 'osrm', networkTimeoutSeconds: 8 },
      },
    ],
  },
  manifest: {
    name: 'TripBudget',
    short_name: 'TripBudget',
    description: 'Offline-first travel planner and budget tracker',
    theme_color: '#3880ff',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },
}),
```

- [ ] **Step 3: Request persistent storage in `src/main.tsx`**

Add after `setupIonicReact()`:
```typescript
// Request persistent storage so IndexedDB is not evicted under disk pressure
if (navigator.storage?.persist) {
  navigator.storage.persist()
}
```

- [ ] **Step 4: Add offline banner to `src/features/trips/components/TripsPage.tsx`**

Add an offline indicator that shows when the browser is offline:
```typescript
import { useState, useEffect } from 'react'
// Inside TripsPage component, before return:
const [offline, setOffline] = useState(!navigator.onLine)
useEffect(() => {
  const on = () => setOffline(false)
  const off = () => setOffline(true)
  window.addEventListener('online', on)
  window.addEventListener('offline', off)
  return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
}, [])

// Add inside IonContent, before trip list:
{offline && (
  <div style={{ background: '#f39c12', color: '#fff', padding: '0.5rem 1rem', fontSize: '0.85rem', textAlign: 'center' }}>
    ⚠️ Offline — showing cached data
  </div>
)}
```

- [ ] **Step 5: Build and verify PWA**

```bash
npm run build
npm run preview
```

Open browser → DevTools → Application → Service Workers: should show registered SW.
Application → Manifest: should show app icons and display mode.
Network tab → throttle to Offline → reload: app should still load from cache.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/main.tsx src/features/trips/components/TripsPage.tsx public/
git commit -m "feat: PWA polish — Workbox caching strategy, persistent storage, offline banner"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run all tests**

```bash
npm run test:run
```

Expected: all tests PASS (Plans 1 + 2 + 3 combined), 0 failures.

- [ ] **Step 2: Full production build**

```bash
npm run build
```

Expected: TypeScript clean, Workbox generates precache manifest, build completes in `dist/`.

- [ ] **Step 3: Manual end-to-end smoke test**

```bash
npm run preview
```

Walk through the complete app:
1. Create a trip → day cards generate
2. Add stops (online and offline), transport legs, accommodation
3. Calendar tab: monthly grid with accommodation color indicators
4. Expenses tab: add expenses in multiple currencies → conversion previews + budget bars
5. Packing tab: add items, check them off, see weight total
6. Map tab: pinned stops appear as markers, route lines connect them
7. Trip summary: spend totals, category breakdown, accommodation list
8. Settings: edit a category (rename + recolor) → appears immediately in expenses
9. Settings: export all → JSON file downloads
10. Settings: import the same JSON with "merge" → no duplicates
11. DevTools → Application → Manifest: PWA installable
12. Network → Offline → reload: app loads from cache

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: app complete — summary, settings, export/import, Drive sync, PWA polish (build steps 9–13)"
```
