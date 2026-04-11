import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'

export function useMapData(tripId: string) {
  const allStops = useLiveQuery(async () => {
    const days = await db.days.where('tripId').equals(tripId).toArray()
    const dayIds = days.map(d => d.id)
    return dayIds.length
      ? await db.stops.where('dayId').anyOf(dayIds).toArray()
      : []
  }, [tripId]) ?? []

  const stopsWithCoords = allStops.filter(s => s.lat !== undefined && s.lng !== undefined)
  const unpinnedStops = allStops.filter(s => s.lat === undefined)

  const legs = useLiveQuery(
    () => db.transportLegs.where('tripId').equals(tripId).toArray(),
    [tripId]
  ) ?? []

  return { stopsWithCoords, unpinnedStops, legs }
}
