import { TripRepository } from '../../../db/repositories/TripRepository'

export function useTrips() {
  const trips = TripRepository.useAll()
  return { trips: trips ?? [] }
}
