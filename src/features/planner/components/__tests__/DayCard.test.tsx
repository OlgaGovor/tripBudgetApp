// src/features/planner/components/__tests__/DayCard.test.tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import DayCard from '../DayCard'
import type { Day, Stop, TransportLeg, Accommodation } from '../../../../db/schema'
import { useStops } from '../../hooks/useStops'

vi.mock('@ionic/react', () => ionicMock)
vi.mock('../StopItem', () => ({ default: () => <div data-testid="stop-item" /> }))
vi.mock('../TransportCard', () => ({ default: () => <div data-testid="transport-card" /> }))
vi.mock('../AccommodationDayCard', () => ({ default: ({ accommodation }: any) =>
  accommodation ? <div>{accommodation.name}</div> : <div>Add accommodation</div>
}))
vi.mock('../StopFormModal', () => ({ default: () => null }))
vi.mock('../TransportLegFormModal', () => ({ default: () => null }))
vi.mock('../../hooks/useStops', () => ({
  useStops: vi.fn(() => ({ stops: [] })),
}))
vi.mock('../../../../db/repositories/StopRepository', () => ({
  StopRepository: { reorder: vi.fn() },
}))
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => undefined,
}))
vi.mock('../../../../db/db', () => ({
  db: {
    days: { where: () => ({ filter: () => ({ sortBy: () => Promise.resolve([]) }) }) },
    stops: { where: () => ({ equals: () => ({ sortBy: () => Promise.resolve([]) }) }) },
  },
}))

const DAY: Day = { id: 'day1', tripId: 'trip1', date: '2026-05-03', dayNumber: 3 }

const STOP: Stop = { id: 'stop1', dayId: 'day1', order: 0, placeName: 'Paris', usefulLinks: [] }

const LEG_SAME_DAY: TransportLeg = {
  id: 'leg1', tripId: 'trip1', fromStopId: 'stop1', toStopId: 'stop2',
  method: 'train', status: 'booked',
  departureDateTime: '2026-05-03T10:00', arrivalDateTime: '2026-05-03T13:30',
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
    vi.mocked(useStops).mockReturnValue({ stops: [STOP] })
    render(<DayCard day={DAY} tripId="trip1" legs={[]} accommodations={[]} />)
    expect(screen.getByText(/add leg after Paris/)).toBeInTheDocument()
  })

  it('shows TransportCard for a stop that has a departing leg', () => {
    vi.mocked(useStops).mockReturnValue({ stops: [STOP] })
    render(<DayCard day={DAY} tripId="trip1" legs={[LEG_SAME_DAY]} accommodations={[]} />)
    expect(screen.getByTestId('transport-card')).toBeInTheDocument()
    expect(screen.queryByText(/add leg after Paris/)).not.toBeInTheDocument()
  })

  it('shows empty accommodation card when no accommodation set', () => {
    render(<DayCard day={DAY} tripId="trip1" legs={[]} accommodations={[]} />)
    expect(screen.getByText('Add accommodation')).toBeInTheDocument()
  })

  it('shows filled accommodation card when day has accommodation', () => {
    const dayWithAccom: Day = { ...DAY, accommodationId: 'accom1' }
    render(<DayCard day={dayWithAccom} tripId="trip1" legs={[]} accommodations={[ACCOM]} />)
    expect(screen.getByText('Grand Hotel')).toBeInTheDocument()
  })
})
