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
  accommodationId?: string // set when auto-created from an accommodation
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
  price?: number
  priceCurrency?: string
  notes?: string
  bookingLink?: string
  usefulLinks: Link[]
}

export interface Accommodation {
  id: string
  tripId: string
  name: string
  placeName?: string       // searchable place name (used as stop placeName)
  lat?: number
  lng?: number
  link?: string
  status: 'not_booked' | 'booked' | 'booked_paid'
  checkIn: string          // YYYY-MM-DD (inclusive)
  checkOut: string         // YYYY-MM-DD (exclusive — hotel-style)
  price?: number
  priceCurrency?: string
  notes?: string
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
  accommodationId?: string
  transportLegId?: string
}

export interface PackingItem {
  id: string
  tripId: string
  label: string
  checked: boolean
  order: number
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
