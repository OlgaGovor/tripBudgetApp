# Transport & Accommodation UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current inline transport/accommodation rendering with three distinct card types — blue stops, purple transport legs (between stops), and teal accommodation (always at bottom of day).

**Architecture:** Two new card components (`TransportCard`, `AccommodationDayCard`) are created. `DayCard` is updated to own the new rendering order (in-transit → stops interleaved with transport/add-leg → accommodation). `StopItem` is stripped of its transport-rendering responsibility.

**Tech Stack:** React + TypeScript, Ionic React, Dexie `useLiveQuery`, existing `TransportLegRepository` / `AccommodationRepository`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/features/planner/components/TransportCard.tsx` | Purple card showing method · route · times · status · edit/delete |
| Create | `src/features/planner/components/AccommodationDayCard.tsx` | Teal card — filled (name + dates + status) and empty (dashed, "＋ Add") |
| Modify | `src/features/planner/components/StopItem.tsx` | Remove transport-leg rendering and "Add transport" button |
| Modify | `src/features/planner/components/DayCard.tsx` | New rendering order: in-transit → stops+transport interleaved → accommodation at bottom |
| Create | `src/features/planner/components/__tests__/TransportCard.test.tsx` | Verify card renders route, times, overnight badge |
| Create | `src/features/planner/components/__tests__/AccommodationDayCard.test.tsx` | Verify filled and empty states |
| Modify | `src/features/planner/components/__tests__/DayCard.test.tsx` | Verify in-transit card, add-leg button, accommodation at bottom |

---

## Task 1: Create `TransportCard.tsx`

**Files:**
- Create: `src/features/planner/components/TransportCard.tsx`
- Create: `src/features/planner/components/__tests__/TransportCard.test.tsx`

- [ ] **Step 1.1: Write the failing test**

```tsx
// src/features/planner/components/__tests__/TransportCard.test.tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import TransportCard from '../TransportCard'
import type { TransportLeg } from '../../../../db/schema'

vi.mock('@ionic/react', () => ionicMock)
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => any) => {
    try { return fn() } catch { return undefined }
  },
}))
vi.mock('../../../../db/db', () => ({
  db: {
    stops: { get: (id: string) => Promise.resolve(
      id === 'stop-a' ? { id: 'stop-a', placeName: 'Paris' } :
      id === 'stop-b' ? { id: 'stop-b', placeName: 'Rome' } : undefined
    )},
  },
}))
vi.mock('../../../../db/repositories/TransportLegRepository', () => ({
  TransportLegRepository: { delete: vi.fn() },
  isOvernightTransport: (leg: any) =>
    !!leg.arrivalDateTime && !!leg.departureDateTime &&
    leg.arrivalDateTime.slice(0, 10) > leg.departureDateTime.slice(0, 10),
}))

const BASE_LEG: TransportLeg = {
  id: 'leg1', tripId: 'trip1', fromStopId: 'stop-a', toStopId: 'stop-b',
  method: 'train', status: 'booked',
  departureDateTime: '2026-04-16T10:00',
  arrivalDateTime: '2026-04-16T13:30',
  usefulLinks: [],
}

describe('TransportCard', () => {
  it('renders method emoji, route, and times', () => {
    render(<TransportCard leg={BASE_LEG} />)
    expect(screen.getByText('🚆')).toBeInTheDocument()
    expect(screen.getByText(/10:00.*13:30/)).toBeInTheDocument()
  })

  it('shows overnight badge for overnight legs', () => {
    const overnightLeg: TransportLeg = {
      ...BASE_LEG,
      departureDateTime: '2026-04-16T22:45',
      arrivalDateTime: '2026-04-17T06:10',
    }
    render(<TransportCard leg={overnightLeg} />)
    expect(screen.getByText('overnight')).toBeInTheDocument()
    expect(screen.getByText(/next day/)).toBeInTheDocument()
  })

  it('does not show overnight badge for same-day legs', () => {
    render(<TransportCard leg={BASE_LEG} />)
    expect(screen.queryByText('overnight')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 1.2: Run test to confirm it fails**

```bash
cd /Users/olga.govor/Projects/tripBudgetApp
npx vitest run src/features/planner/components/__tests__/TransportCard.test.tsx
```

Expected: FAIL — `Cannot find module '../TransportCard'`

- [ ] **Step 1.3: Create `TransportCard.tsx`**

```tsx
// src/features/planner/components/TransportCard.tsx
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { pencilOutline, trashOutline } from 'ionicons/icons'
import { useLiveQuery } from 'dexie-react-hooks'
import type { TransportLeg } from '../../../db/schema'
import { db } from '../../../db/db'
import { TransportLegRepository, isOvernightTransport } from '../../../db/repositories/TransportLegRepository'
import TransportLegFormModal from './TransportLegFormModal'

const METHOD_ICONS: Record<TransportLeg['method'], string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}
const STATUS_COLORS: Record<TransportLeg['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

interface Props { leg: TransportLeg }

const TransportCard: React.FC<Props> = ({ leg }) => {
  const [showEdit, setShowEdit] = useState(false)
  const fromStop = useLiveQuery(() => db.stops.get(leg.fromStopId), [leg.fromStopId])
  const toStop = useLiveQuery(() => db.stops.get(leg.toStopId), [leg.toStopId])
  const overnight = isOvernightTransport(leg)
  const dep = leg.departureDateTime?.slice(11, 16)
  const arr = leg.arrivalDateTime?.slice(11, 16)
  const timeStr = dep && arr ? `${dep} → ${arr}${overnight ? ' next day' : ''}` : (dep ?? '')

  return (
    <>
      <div style={{
        margin: '5px 10px', padding: '7px 10px',
        background: 'rgba(155,89,182,0.08)', borderRadius: 6,
        borderLeft: '3px solid #9b59b6',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{METHOD_ICONS[leg.method]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#444' }}>
            {fromStop?.placeName ?? '…'} → {toStop?.placeName ?? '…'}
          </div>
          {timeStr && <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 1 }}>{timeStr}</div>}
        </div>
        {overnight && (
          <span style={{ fontSize: '0.7rem', background: '#9b59b6', color: '#fff', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>
            overnight
          </span>
        )}
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[leg.status], flexShrink: 0 }} />
        <IonButton fill="clear" size="small" onClick={() => setShowEdit(true)}>
          <IonIcon icon={pencilOutline} />
        </IonButton>
        <IonButton fill="clear" size="small" color="danger" onClick={() => TransportLegRepository.delete(leg.id)}>
          <IonIcon icon={trashOutline} />
        </IonButton>
      </div>
      <TransportLegFormModal
        isOpen={showEdit}
        onDismiss={() => setShowEdit(false)}
        tripId={leg.tripId}
        fromStopId={leg.fromStopId}
        leg={leg}
      />
    </>
  )
}

export default TransportCard
```

- [ ] **Step 1.4: Run test to confirm it passes**

```bash
npx vitest run src/features/planner/components/__tests__/TransportCard.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 1.5: Commit**

```bash
git add src/features/planner/components/TransportCard.tsx \
        src/features/planner/components/__tests__/TransportCard.test.tsx
git commit -m "feat: add TransportCard purple card component"
```

---

## Task 2: Create `AccommodationDayCard.tsx`

**Files:**
- Create: `src/features/planner/components/AccommodationDayCard.tsx`
- Create: `src/features/planner/components/__tests__/AccommodationDayCard.test.tsx`

- [ ] **Step 2.1: Write the failing test**

```tsx
// src/features/planner/components/__tests__/AccommodationDayCard.test.tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import AccommodationDayCard from '../AccommodationDayCard'
import type { Accommodation } from '../../../../db/schema'

vi.mock('@ionic/react', () => ionicMock)
vi.mock('../../../../db/repositories/AccommodationRepository', () => ({
  AccommodationRepository: { delete: vi.fn() },
}))

const ACCOM: Accommodation = {
  id: 'accom1', tripId: 'trip1', name: 'Hotel Artemide',
  status: 'booked', checkIn: '2026-04-14', checkOut: '2026-04-16',
  usefulLinks: [],
}

describe('AccommodationDayCard', () => {
  it('empty state shows add accommodation prompt', () => {
    render(<AccommodationDayCard tripId="trip1" initialDate="2026-04-14" />)
    expect(screen.getByText(/Add accommodation/)).toBeInTheDocument()
  })

  it('filled state shows hotel name and dates', () => {
    render(<AccommodationDayCard accommodation={ACCOM} tripId="trip1" />)
    expect(screen.getByText('Hotel Artemide')).toBeInTheDocument()
    expect(screen.getByText(/14 Apr.*16 Apr/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2.2: Run test to confirm it fails**

```bash
npx vitest run src/features/planner/components/__tests__/AccommodationDayCard.test.tsx
```

Expected: FAIL — `Cannot find module '../AccommodationDayCard'`

- [ ] **Step 2.3: Create `AccommodationDayCard.tsx`**

```tsx
// src/features/planner/components/AccommodationDayCard.tsx
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { pencilOutline, trashOutline } from 'ionicons/icons'
import type { Accommodation } from '../../../db/schema'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import AccommodationFormModal from './AccommodationFormModal'

const STATUS_COLORS: Record<Accommodation['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

interface Props {
  accommodation?: Accommodation
  tripId: string
  initialDate?: string
}

const AccommodationDayCard: React.FC<Props> = ({ accommodation, tripId, initialDate }) => {
  const [showForm, setShowForm] = useState(false)

  if (!accommodation) {
    return (
      <>
        <div
          onClick={() => setShowForm(true)}
          style={{
            margin: '5px 10px', padding: '7px 10px',
            borderRadius: 6, border: '1px dashed #b2dfdb', borderLeft: '3px solid #b2dfdb',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '1rem', opacity: 0.4 }}>🏨</span>
          <span style={{ color: '#16a085', fontWeight: 500 }}>＋ Add accommodation</span>
        </div>
        <AccommodationFormModal
          isOpen={showForm}
          onDismiss={() => setShowForm(false)}
          tripId={tripId}
          initialDate={initialDate}
        />
      </>
    )
  }

  return (
    <>
      <div style={{
        margin: '5px 10px', padding: '7px 10px',
        background: 'rgba(22,160,133,0.08)', borderRadius: 6,
        borderLeft: '3px solid #16a085',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>🏨</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#444' }}>{accommodation.name}</div>
          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 1 }}>
            {fmtDate(accommodation.checkIn)} → {fmtDate(accommodation.checkOut)}
          </div>
        </div>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[accommodation.status], flexShrink: 0 }} />
        <IonButton fill="clear" size="small" onClick={() => setShowForm(true)}>
          <IonIcon icon={pencilOutline} />
        </IonButton>
        <IonButton fill="clear" size="small" color="danger" onClick={() => AccommodationRepository.delete(accommodation.id)}>
          <IonIcon icon={trashOutline} />
        </IonButton>
      </div>
      <AccommodationFormModal
        isOpen={showForm}
        onDismiss={() => setShowForm(false)}
        tripId={tripId}
        accommodation={accommodation}
      />
    </>
  )
}

export default AccommodationDayCard
```

- [ ] **Step 2.4: Run test to confirm it passes**

```bash
npx vitest run src/features/planner/components/__tests__/AccommodationDayCard.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 2.5: Commit**

```bash
git add src/features/planner/components/AccommodationDayCard.tsx \
        src/features/planner/components/__tests__/AccommodationDayCard.test.tsx
git commit -m "feat: add AccommodationDayCard teal card component"
```

---

## Task 3: Update `StopItem.tsx` — remove transport rendering

**Files:**
- Modify: `src/features/planner/components/StopItem.tsx`

- [ ] **Step 3.1: Replace `StopItem.tsx` with the stripped-down version**

Remove `legsFromThisStop`-dependent transport rendering, `showTransportForm` state, `TransportLegItem` import, `TransportLegFormModal` import, `addOutline` icon import, `nearbyStops` and `dayDate` props. Keep `legsFromThisStop` prop since it's still used for the delete-guard logic.

New `StopItem.tsx`:

```tsx
// src/features/planner/components/StopItem.tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { IonButton, IonIcon } from '@ionic/react'
import { chevronUpOutline, chevronDownOutline, pencilOutline, trashOutline } from 'ionicons/icons'
import type { Stop, TransportLeg } from '../../../db/schema'
import { db } from '../../../db/db'
import StopFormModal from './StopFormModal'

interface Props {
  stop: Stop
  tripId: string
  legsFromThisStop: TransportLeg[]
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const StopItem: React.FC<Props> = ({ stop, tripId, legsFromThisStop, canMoveUp, canMoveDown, onMoveUp, onMoveDown }) => {
  const [showStopEditForm, setShowStopEditForm] = useState(false)

  const usedAsDestination = useLiveQuery(
    () => db.transportLegs.where('toStopId').equals(stop.id).first().then(leg => !!leg),
    [stop.id]
  )
  const usedInTransport = legsFromThisStop.length > 0 || !!usedAsDestination

  async function handleDelete() {
    await db.stops.delete(stop.id)
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <IonButton fill="clear" size="small" disabled={!canMoveUp} onClick={onMoveUp}>
            <IonIcon icon={chevronUpOutline} />
          </IonButton>
          <IonButton fill="clear" size="small" disabled={!canMoveDown} onClick={onMoveDown}>
            <IonIcon icon={chevronDownOutline} />
          </IonButton>
          <IonButton fill="clear" size="small" onClick={() => setShowStopEditForm(true)}>
            <IonIcon icon={pencilOutline} />
          </IonButton>
          <IonButton
            fill="clear" size="small" color="danger"
            onClick={handleDelete}
            disabled={usedInTransport}
            title={usedInTransport ? 'Used in a transport leg — remove the transport first' : undefined}
          >
            <IonIcon icon={trashOutline} />
          </IonButton>
        </div>
      </div>
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

- [ ] **Step 3.2: Run TypeScript check to confirm no type errors**

```bash
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to this change)

- [ ] **Step 3.3: Run full test suite**

```bash
npx vitest run
```

Expected: all passing

- [ ] **Step 3.4: Commit**

```bash
git add src/features/planner/components/StopItem.tsx
git commit -m "refactor: remove transport rendering from StopItem"
```

---

## Task 4: Update `DayCard.tsx` — new rendering order

**Files:**
- Modify: `src/features/planner/components/DayCard.tsx`
- Modify: `src/features/planner/components/__tests__/DayCard.test.tsx`

- [ ] **Step 4.1: Update `DayCard.test.tsx` with new assertions**

Replace the existing test file content:

```tsx
// src/features/planner/components/__tests__/DayCard.test.tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import DayCard from '../DayCard'
import type { Day, Stop, TransportLeg, Accommodation } from '../../../../db/schema'

vi.mock('@ionic/react', () => ionicMock)
vi.mock('../../../../db/repositories/StopRepository', () => ({
  StopRepository: { useByDayId: () => [] },
}))
vi.mock('../../../../db/repositories/TransportLegRepository', () => ({
  TransportLegRepository: { delete: vi.fn() },
  isOvernightTransport: () => false,
}))
vi.mock('../../../../db/repositories/AccommodationRepository', () => ({
  AccommodationRepository: { delete: vi.fn() },
}))
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => any) => {
    try { return fn() } catch { return undefined }
  },
}))
vi.mock('../../../../db/db', () => ({
  db: {
    days: { where: () => ({ filter: () => ({ sortBy: () => Promise.resolve([]) }) }) },
    stops: { get: () => Promise.resolve(undefined), where: () => ({ equals: () => ({ first: () => Promise.resolve(null) }) }) },
    transportLegs: { where: () => ({ equals: () => ({ first: () => Promise.resolve(null) }) }) },
  },
}))

const DAY: Day = { id: 'day1', tripId: 'trip1', date: '2026-05-03', dayNumber: 3 }

const STOP: Stop = { id: 'stop1', dayId: 'day1', order: 0, placeName: 'Paris', usefulLinks: [] }

const LEG: TransportLeg = {
  id: 'leg1', tripId: 'trip1', fromStopId: 'stop1', toStopId: 'stop2',
  method: 'train', status: 'booked',
  departureDateTime: '2026-05-03T22:00', arrivalDateTime: '2026-05-04T06:00',
  usefulLinks: [],
}

const IN_TRANSIT_LEG: TransportLeg = {
  id: 'leg2', tripId: 'trip1', fromStopId: 'stop0', toStopId: 'stop1',
  method: 'plane', status: 'booked_paid',
  departureDateTime: '2026-05-02T20:00', arrivalDateTime: '2026-05-03T08:00',
  usefulLinks: [],
}

const ACCOM: Accommodation = {
  id: 'accom1', tripId: 'trip1', name: 'Grand Hotel',
  status: 'booked', checkIn: '2026-05-03', checkOut: '2026-05-05',
  usefulLinks: [],
}

describe('DayCard', () => {
  it('renders day number and date', () => {
    render(<DayCard day={DAY} tripId="trip1" legs={[]} accommodations={[]} />)
    expect(screen.getByText(/Day 3/)).toBeInTheDocument()
    expect(screen.getByText(/May 3/)).toBeInTheDocument()
  })

  it('shows in-transit card at top when an overnight leg arrives this day', () => {
    render(<DayCard day={DAY} tripId="trip1" legs={[IN_TRANSIT_LEG]} accommodations={[]} />)
    expect(screen.getByText(/In transit/)).toBeInTheDocument()
  })

  it('shows add-leg button for a stop with no departing leg', () => {
    vi.mocked(require('../../../../db/repositories/StopRepository').StopRepository.useByDayId)
      .mockReturnValue([STOP])
    render(<DayCard day={DAY} tripId="trip1" legs={[]} accommodations={[]} />)
    expect(screen.getByText(/add leg after Paris/)).toBeInTheDocument()
  })

  it('shows empty accommodation card when no accommodation set', () => {
    render(<DayCard day={DAY} tripId="trip1" legs={[]} accommodations={[]} />)
    expect(screen.getByText(/Add accommodation/)).toBeInTheDocument()
  })

  it('shows filled accommodation card when day has accommodation', () => {
    const dayWithAccom: Day = { ...DAY, accommodationId: 'accom1' }
    render(<DayCard day={dayWithAccom} tripId="trip1" legs={[]} accommodations={[ACCOM]} />)
    expect(screen.getByText('Grand Hotel')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4.2: Run updated tests to confirm they fail (new tests missing implementation)**

```bash
npx vitest run src/features/planner/components/__tests__/DayCard.test.tsx
```

Expected: first test passes (day number/date), new tests FAIL because DayCard still uses old rendering

- [ ] **Step 4.3: Replace `DayCard.tsx` with new rendering order**

```tsx
// src/features/planner/components/DayCard.tsx
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { chevronDownOutline, chevronUpOutline, addOutline } from 'ionicons/icons'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Accommodation, Day, Stop, TransportLeg } from '../../../db/schema'
import { db } from '../../../db/db'
import { useStops } from '../hooks/useStops'
import { DayRepository } from '../../../db/repositories/DayRepository'
import { StopRepository } from '../../../db/repositories/StopRepository'
import { getDayCardStatus, DAY_CARD_COLORS } from '../../../lib/budget'
import StopItem from './StopItem'
import TransportCard from './TransportCard'
import AccommodationDayCard from './AccommodationDayCard'
import StopFormModal from './StopFormModal'
import TransportLegFormModal from './TransportLegFormModal'

const METHOD_ICONS: Record<TransportLeg['method'], string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}
const STATUS_COLORS: Record<TransportLeg['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

interface Props {
  day: Day
  tripId: string
  legs: TransportLeg[]
  accommodations: Accommodation[]
  isLastDay?: boolean
  dailySpent?: number
  cumulativeSpent?: number
  effectiveDailyBudget?: number
  currency?: string
}

function addDaysToDateStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

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

const InTransitCard: React.FC<{ leg: TransportLeg }> = ({ leg }) => {
  const fromStop = useLiveQuery(() => db.stops.get(leg.fromStopId), [leg.fromStopId])
  const toStop = useLiveQuery(() => db.stops.get(leg.toStopId), [leg.toStopId])
  const arrTime = leg.arrivalDateTime?.slice(11, 16)
  return (
    <div style={{
      margin: '8px 10px 5px', padding: '7px 10px',
      background: 'rgba(155,89,182,0.08)', borderRadius: 6,
      borderLeft: '3px solid #9b59b6',
      display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
    }}>
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{METHOD_ICONS[leg.method]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#444' }}>
          In transit · {fromStop?.placeName ?? '…'} → {toStop?.placeName ?? '…'}
        </div>
        {arrTime && <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 1 }}>arrives {arrTime}</div>}
      </div>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[leg.status], flexShrink: 0 }} />
    </div>
  )
}

const DayCard: React.FC<Props> = ({ day, tripId, legs, accommodations, dailySpent = 0, cumulativeSpent = 0, effectiveDailyBudget, currency }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [showStopForm, setShowStopForm] = useState(false)
  const [addLegFromStopId, setAddLegFromStopId] = useState<string | null>(null)
  const { stops } = useStops(day.id)

  const nearbyStops = useLiveQuery<Array<{ stop: Stop; dayNumber: number }>>(
    async () => {
      const endDate = addDaysToDateStr(day.date, 3)
      const nearbyDays = await db.days
        .where('tripId').equals(tripId)
        .filter(dd => dd.date >= day.date && dd.date <= endDate)
        .sortBy('date')
      const result: Array<{ stop: Stop; dayNumber: number }> = []
      for (const nd of nearbyDays) {
        const ndStops = await db.stops.where('dayId').equals(nd.id).sortBy('order')
        for (const s of ndStops) {
          result.push({ stop: s, dayNumber: nd.dayNumber })
        }
      }
      return result
    },
    [tripId, day.date]
  )

  const dayAccom = accommodations.find(a => a.id === day.accommodationId)
  const legsForStop = (stopId: string): TransportLeg[] =>
    legs.filter(l => l.fromStopId === stopId)

  const inTransitLegs = legs.filter(l => {
    if (!l.departureDateTime || !l.arrivalDateTime) return false
    const depDate = l.departureDateTime.slice(0, 10)
    const arrDate = l.arrivalDateTime.slice(0, 10)
    return depDate < day.date && day.date <= arrDate
  })

  function swapStops(i: number, j: number): string[] {
    const ids = stops.map(s => s.id)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    return ids
  }

  return (
    <div style={{ borderRadius: 12, margin: '0.75rem 1rem', background: 'var(--ion-color-light)', overflow: 'hidden' }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600 }}
      >
        <span style={{ flex: 1 }}>Day {day.dayNumber} · {formatDate(day.date)}</span>
        {effectiveDailyBudget && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            {dailySpent > 0 && (
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: DAY_CARD_COLORS[getDayCardStatus(dailySpent / effectiveDailyBudget)] }}>
                {dailySpent.toFixed(0)} {currency}
              </span>
            )}
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              background: DAY_CARD_COLORS[getDayCardStatus(cumulativeSpent / (effectiveDailyBudget * day.dayNumber))],
            }} />
          </div>
        )}
        <IonIcon icon={collapsed ? chevronDownOutline : chevronUpOutline} />
      </div>

      {!collapsed && (
        <div style={{ paddingBottom: '0.5rem' }}>
          {inTransitLegs.map(leg => (
            <InTransitCard key={leg.id} leg={leg} />
          ))}

          {stops.map((stop, i) => {
            const stopLegs = legsForStop(stop.id)
            return (
              <div key={stop.id}>
                <StopItem
                  stop={stop}
                  tripId={tripId}
                  legsFromThisStop={stopLegs}
                  canMoveUp={i > 0}
                  canMoveDown={i < stops.length - 1}
                  onMoveUp={() => StopRepository.reorder(day.id, swapStops(i, i - 1))}
                  onMoveDown={() => StopRepository.reorder(day.id, swapStops(i, i + 1))}
                />
                {stopLegs.length > 0
                  ? stopLegs.map(leg => <TransportCard key={leg.id} leg={leg} />)
                  : (
                    <div style={{ margin: '4px 10px 7px' }}>
                      <button
                        onClick={() => setAddLegFromStopId(stop.id)}
                        style={{
                          fontSize: '0.75rem', color: '#bbb', background: 'none',
                          border: '1px dashed #ddd', borderRadius: 10, padding: '3px 10px', cursor: 'pointer',
                        }}
                      >
                        ＋ add leg after {stop.placeName}
                      </button>
                    </div>
                  )
                }
              </div>
            )
          })}

          <AccommodationDayCard
            accommodation={dayAccom}
            tripId={tripId}
            initialDate={day.date}
          />

          <IonButton fill="clear" size="small" style={{ marginLeft: '0.5rem' }} onClick={() => setShowStopForm(true)}>
            <IonIcon icon={addOutline} /> Add stop
          </IonButton>

          <NoteSection day={day} />
        </div>
      )}

      <StopFormModal isOpen={showStopForm} onDismiss={() => setShowStopForm(false)} tripId={tripId} dayId={day.id} />
      {addLegFromStopId && (
        <TransportLegFormModal
          isOpen={true}
          onDismiss={() => setAddLegFromStopId(null)}
          tripId={tripId}
          fromStopId={addLegFromStopId}
          nearbyStops={nearbyStops ?? []}
          initialDate={day.date}
        />
      )}
    </div>
  )
}

export default DayCard
```

- [ ] **Step 4.4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no new type errors

- [ ] **Step 4.5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4.6: Run build to confirm it compiles**

```bash
npm run build
```

Expected: build succeeds with no errors

- [ ] **Step 4.7: Commit**

```bash
git add src/features/planner/components/DayCard.tsx \
        src/features/planner/components/__tests__/DayCard.test.tsx
git commit -m "feat: redesign DayCard with transport/accommodation cards"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Blue stop cards (no icon, existing `StopItem` style unchanged) — `StopItem` keeps `borderLeft: '3px solid var(--ion-color-primary)'`
- [x] Purple transport card between stops — `TransportCard.tsx` Task 1
- [x] "Add leg after [stop]" dashed button when no leg — Task 4, `DayCard` stop loop
- [x] In-transit card at top of arrival day (read-only, no edit/delete) — `InTransitCard` in `DayCard`
- [x] Teal accommodation card at bottom (filled + empty states) — `AccommodationDayCard.tsx` Task 2
- [x] Overnight badge + "next day" time annotation — `TransportCard` overnight logic
- [x] Status dot (red/orange/green) on transport and accommodation cards — both components
- [x] One transport leg per stop-gap — rendered via `legsForStop(stop.id)`, "add leg" only shows when `stopLegs.length === 0`

**Removed from spec scope (YAGNI):**
- `TransportLegFormModal` `defaultFromStopId` prop — not needed since `DayCard` always provides `fromStopId` from the specific stop
