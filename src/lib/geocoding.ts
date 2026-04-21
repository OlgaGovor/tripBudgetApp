export interface PlaceResult {
  displayName: string
  lat: number
  lng: number
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geocoding search failed')
  const data: {
    features: Array<{
      geometry: { coordinates: [number, number] }
      properties: { name?: string; city?: string; state?: string; country?: string }
    }>
  } = await response.json()
  return data.features.map(f => {
    const p = f.properties
    const seen = new Set<string>()
    const parts: string[] = []
    for (const part of [p.name, p.city, p.state, p.country]) {
      if (part && !seen.has(part)) { seen.add(part); parts.push(part) }
    }
    return {
      displayName: parts.join(', '),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }
  })
}
