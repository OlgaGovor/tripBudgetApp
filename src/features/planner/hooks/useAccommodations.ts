import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
export function useAccommodations(tripId: string) {
  return { accommodations: AccommodationRepository.useByTripId(tripId) ?? [] }
}
