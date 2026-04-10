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
