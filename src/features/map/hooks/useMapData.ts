import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'

export function useMapData(tripId: string) {
  const stopsWithCoords = useLiveQuery(async () => {
    const days = await db.days.where('tripId').equals(tripId).toArray()
    const dayIds = days.map(d => d.id)
    const stops = dayIds.length
      ? await db.stops.where('dayId').anyOf(dayIds).toArray()
      : []
    return stops.filter(s => s.lat !== undefined && s.lng !== undefined)
  }, [tripId]) ?? []

  const unpinnedStops = useLiveQuery(async () => {
    const days = await db.days.where('tripId').equals(tripId).toArray()
    const dayIds = days.map(d => d.id)
    const stops = dayIds.length
      ? await db.stops.where('dayId').anyOf(dayIds).toArray()
      : []
    return stops.filter(s => s.lat === undefined)
  }, [tripId]) ?? []

  const legs = useLiveQuery(
    () => db.transportLegs.where('tripId').equals(tripId).toArray(),
    [tripId]
  ) ?? []

  return { stopsWithCoords, unpinnedStops, legs }
}
