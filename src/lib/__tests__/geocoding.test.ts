import { describe, expect, it, vi, beforeEach } from 'vitest'
import { searchPlaces } from '../geocoding'

beforeEach(() => { vi.restoreAllMocks() })

describe('searchPlaces', () => {
  it('maps Nominatim response to PlaceResult array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { display_name: 'Shinjuku, Tokyo, Japan', lat: '35.6896', lon: '139.7006' },
      ],
    }))

    const results = await searchPlaces('Shinjuku')
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      displayName: 'Shinjuku, Tokyo, Japan',
      lat: 35.6896,
      lng: 139.7006,
    })
  })

  it('throws when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(searchPlaces('nowhere')).rejects.toThrow('Nominatim search failed')
  })
})
