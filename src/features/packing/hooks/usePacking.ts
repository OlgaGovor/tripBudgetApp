import { PackingRepository } from '../../../db/repositories/PackingRepository'

export function usePacking(tripId: string) {
  return { items: PackingRepository.useByTripId(tripId) ?? [] }
}
