import Dexie, { type Table } from 'dexie'
import type {
  Trip, Day, Stop, TransportLeg, Accommodation,
  ExpenseCategory, Expense, PackingItem, ExchangeRateCache, UserSettings,
} from './schema'

class TripBudgetDB extends Dexie {
  trips!: Table<Trip>
  days!: Table<Day>
  stops!: Table<Stop>
  transportLegs!: Table<TransportLeg>
  accommodations!: Table<Accommodation>
  expenseCategories!: Table<ExpenseCategory>
  expenses!: Table<Expense>
  packingItems!: Table<PackingItem>
  exchangeRateCache!: Table<ExchangeRateCache>
  userSettings!: Table<UserSettings>

  constructor() {
    super('TripBudgetDB')
    this.version(1).stores({
      trips:             'id, createdAt',
      days:              'id, tripId, date',
      stops:             'id, dayId',
      transportLegs:     'id, tripId, fromStopId, toStopId',
      accommodations:    'id, tripId, checkIn, checkOut',
      expenseCategories: 'id',
      expenses:          'id, tripId, dayId, date',
      packingItems:      'id, tripId',
      exchangeRateCache: 'base',
      userSettings:      'id',
    })
    this.version(2).stores({
      stops: 'id, dayId, accommodationId',
    })
  }
}

export const db = new TripBudgetDB()
