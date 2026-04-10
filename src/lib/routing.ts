const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

export async function fetchRoadRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<[number, number][]> {
  const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error('OSRM request failed')
  const data = await res.json()
  if (!data.routes?.length) throw new Error('OSRM returned no routes')
  // OSRM GeoJSON uses [lng, lat] — flip to [lat, lng] for Leaflet
  return (data.routes[0].geometry.coordinates as [number, number][]).map(
    ([lng, lat]) => [lat, lng]
  )
}

/** Linear interpolation of 20 points along a great-circle arc (good enough for display). */
export function greatCircleArc(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  steps = 20
): [number, number][] {
  const points: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    points.push([
      from.lat + (to.lat - from.lat) * t,
      from.lng + (to.lng - from.lng) * t,
    ])
  }
  return points
}
