import { describe, expect, it, vi, beforeEach } from 'vitest'
import { searchPlaces } from '../geocoding'

beforeEach(() => { vi.restoreAllMocks() })

function mockFetch(features: unknown[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ type: 'FeatureCollection', features }),
  }))
}

describe('searchPlaces', () => {
  it('maps Photon response to PlaceResult array', async () => {
    mockFetch([
      {
        geometry: { coordinates: [139.7006, 35.6896] },
        properties: { name: 'Shinjuku', city: 'Tokyo', country: 'Japan' },
      },
    ])

    const results = await searchPlaces('Shinjuku')
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      displayName: 'Shinjuku, Tokyo, Japan',
      city: 'Tokyo',
      lat: 35.6896,
      lng: 139.7006,
    })
  })

  it('falls back to town or village for city and skips duplicate parts', async () => {
    mockFetch([
      {
        geometry: { coordinates: [11.25, 43.77] },
        properties: { name: 'Greve', town: 'Greve', state: 'Tuscany', country: 'Italy' },
      },
      {
        geometry: { coordinates: [7.65, 45.97] },
        properties: { name: 'Zermatt', village: 'Zermatt', country: 'Switzerland' },
      },
    ])

    const results = await searchPlaces('somewhere')
    expect(results.map(r => [r.displayName, r.city])).toEqual([
      ['Greve, Tuscany, Italy', 'Greve'],
      ['Zermatt, Switzerland', 'Zermatt'],
    ])
  })

  it('URL-encodes the query', async () => {
    mockFetch([])
    await searchPlaces('São Paulo & co')
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('q=S%C3%A3o%20Paulo%20%26%20co')
  })

  it('throws when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(searchPlaces('nowhere')).rejects.toThrow('Geocoding search failed')
  })
})
