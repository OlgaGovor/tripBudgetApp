import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'

export function useMapData(tripId: string) {
  const allStops = useLiveQuery(async () => {
    const days = await db.days.where('tripId').equals(tripId).toArray()
    const dayIds = days.map(d => d.id)
    return dayIds.length
      ? await db.stops.where('dayId').anyOf(dayIds).toArray()
      : []
  }, [tripId])

  const stopsWithCoords = useMemo(
    () => (allStops ?? []).filter(s => s.lat !== undefined && s.lng !== undefined),
    [allStops]
  )
  const unpinnedStops = useMemo(
    () => (allStops ?? []).filter(s => s.lat === undefined),
    [allStops]
  )

  const legsRaw = useLiveQuery(
    () => db.transportLegs.where('tripId').equals(tripId).toArray(),
    [tripId]
  )
  const legs = useMemo(() => legsRaw ?? [], [legsRaw])

  return { stopsWithCoords, unpinnedStops, legs }
}
