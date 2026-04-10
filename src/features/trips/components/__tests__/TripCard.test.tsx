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
