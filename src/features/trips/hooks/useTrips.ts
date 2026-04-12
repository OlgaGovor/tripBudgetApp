import { TripRepository } from '../../../db/repositories/TripRepository'

export function useTrips() {
  const trips = TripRepository.useAll()
  const sorted = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate))
  return { trips: sorted }
}
