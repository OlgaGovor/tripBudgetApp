export interface PlaceResult {
  displayName: string
  lat: number
  lng: number
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'TripBudgetApp/1.0 (contact@example.com)',
    },
  })
  if (!response.ok) throw new Error('Nominatim search failed')
  const data: Array<{ display_name: string; lat: string; lon: string }> = await response.json()
  return data.map(item => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }))
}
