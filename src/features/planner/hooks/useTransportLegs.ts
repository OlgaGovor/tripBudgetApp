import { TransportLegRepository } from '../../../db/repositories/TransportLegRepository'
export function useTransportLegs(tripId: string) {
  return { legs: TransportLegRepository.useByTripId(tripId) ?? [] }
}
