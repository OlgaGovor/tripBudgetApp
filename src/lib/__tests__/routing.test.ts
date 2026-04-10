import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRoadRoute, greatCircleArc } from '../routing'

beforeEach(() => { vi.restoreAllMocks() })

describe('greatCircleArc', () => {
  it('returns 20 interpolated points between two coordinates', () => {
    const points = greatCircleArc({ lat: 48.85, lng: 2.35 }, { lat: 51.50, lng: -0.12 })
    expect(points).toHaveLength(20)
    // First point near Paris
    expect(points[0][0]).toBeCloseTo(48.85, 1)
    // Last point near London
    expect(points[19][0]).toBeCloseTo(51.50, 1)
  })
})

describe('fetchRoadRoute', () => {
  it('maps OSRM GeoJSON response to [lat, lng] pairs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [{ geometry: { coordinates: [[2.35, 48.85], [2.40, 48.88]] } }],
      }),
    }))
    const points = await fetchRoadRoute({ lat: 48.85, lng: 2.35 }, { lat: 48.88, lng: 2.40 })
    expect(points).toEqual([[48.85, 2.35], [48.88, 2.40]])
  })

  it('throws when OSRM returns no routes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [] }),
    }))
    await expect(fetchRoadRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 })).rejects.toThrow()
  })
})
