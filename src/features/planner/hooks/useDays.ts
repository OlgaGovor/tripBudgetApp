import { DayRepository } from '../../../db/repositories/DayRepository'
export function useDays(tripId: string) {
  return { days: DayRepository.useByTripId(tripId) ?? [] }
}
