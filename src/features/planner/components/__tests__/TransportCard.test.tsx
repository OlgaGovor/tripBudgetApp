// src/features/planner/components/__tests__/TransportCard.test.tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import TransportCard from '../TransportCard'
import type { TransportLeg } from '../../../../db/schema'

vi.mock('@ionic/react', () => ionicMock)
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => any) => {
    try {
      const r = fn()
      return r instanceof Promise ? undefined : r
    } catch { return undefined }
  },
}))
vi.mock('../../../../db/db', () => ({
  db: {
    stops: { get: (id: string) => Promise.resolve(
      id === 'stop-a' ? { id: 'stop-a', placeName: 'Paris' } :
      id === 'stop-b' ? { id: 'stop-b', placeName: 'Rome' } : undefined
    )},
    days: { get: () => Promise.resolve(undefined) },
    trips: { get: () => Promise.resolve(undefined) },
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
