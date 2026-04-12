// src/features/planner/components/__tests__/DayCard.test.tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import DayCard from '../DayCard'
import type { Day } from '../../../../db/schema'

vi.mock('@ionic/react', () => ionicMock)
vi.mock('../../../../db/repositories/StopRepository', () => ({
  StopRepository: { useByDayId: () => [] },
}))
vi.mock('../../../../db/repositories/TransportLegRepository', () => ({
  TransportLegRepository: { useByTripId: () => [] },
  isOvernightTransport: () => false,
}))
vi.mock('../../../../db/repositories/AccommodationRepository', () => ({
  AccommodationRepository: { useByTripId: () => [] },
}))

const DAY: Day = {
  id: 'day1', tripId: 'trip1', date: '2026-05-03', dayNumber: 3,
}

describe('DayCard', () => {
  it('renders day number and date', () => {
    render(<DayCard day={DAY} tripId="trip1" legs={[]} accommodations={[]} />)
    expect(screen.getByText(/Day 3/)).toBeInTheDocument()
    expect(screen.getByText(/May 3/)).toBeInTheDocument()
  })
})
