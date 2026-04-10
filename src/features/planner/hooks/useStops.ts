import { StopRepository } from '../../../db/repositories/StopRepository'
export function useStops(dayId: string) {
  return { stops: StopRepository.useByDayId(dayId) ?? [] }
}
