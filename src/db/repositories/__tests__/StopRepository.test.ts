import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { StopRepository } from '../StopRepository'

beforeEach(async () => { await db.stops.clear() })

const BASE_STOP = {
  dayId: 'day1',
  order: 0,
  placeName: 'Shinjuku Station',
  lat: 35.6896,
  lng: 139.7006,
  usefulLinks: [],
}

describe('StopRepository.create', () => {
  it('persists stop with generated id', async () => {
    const id = await StopRepository.create(BASE_STOP)
    const saved = await db.stops.get(id)
    expect(saved).toMatchObject({ placeName: 'Shinjuku Station', dayId: 'day1' })
  })

  it('allows stop with no coordinates (offline entry)', async () => {
    const id = await StopRepository.create({ ...BASE_STOP, lat: undefined, lng: undefined })
    const saved = await db.stops.get(id)
    expect(saved?.lat).toBeUndefined()
    expect(saved?.lng).toBeUndefined()
  })
})

describe('StopRepository.reorder', () => {
  it('assigns order by position in given array', async () => {
    const id1 = await StopRepository.create({ ...BASE_STOP, order: 0 })
    const id2 = await StopRepository.create({ ...BASE_STOP, order: 1 })
    await StopRepository.reorder('day1', [id2, id1])
    expect((await db.stops.get(id2))?.order).toBe(0)
    expect((await db.stops.get(id1))?.order).toBe(1)
  })
})

describe('StopRepository.delete', () => {
  it('removes the stop', async () => {
    const id = await StopRepository.create(BASE_STOP)
    await StopRepository.delete(id)
    expect(await db.stops.get(id)).toBeUndefined()
  })
})
