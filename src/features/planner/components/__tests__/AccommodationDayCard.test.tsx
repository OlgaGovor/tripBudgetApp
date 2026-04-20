// src/features/planner/components/__tests__/AccommodationDayCard.test.tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ionicMock } from '../../../../components/__mocks__/ionic'
import AccommodationDayCard from '../AccommodationDayCard'
import type { Accommodation } from '../../../../db/schema'

vi.mock('@ionic/react', () => ionicMock)
vi.mock('../AccommodationFormModal', () => ({ default: () => null }))
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
