import { beforeEach, describe, it, expect } from 'vitest'
import { db } from '../../db'
import { PackingRepository } from '../PackingRepository'

beforeEach(async () => { await db.packingItems.clear() })

describe('PackingRepository.toggleChecked', () => {
  it('flips checked from false to true', async () => {
    const id = await PackingRepository.create({ tripId: 'trip1', label: 'Passport', checked: false, order: 0 })
    await PackingRepository.toggleChecked(id)
    expect((await db.packingItems.get(id))?.checked).toBe(true)
  })
})

describe('PackingRepository.copyFromTrip', () => {
  it('copies items unchecked with weights preserved and new ids', async () => {
    const id1 = await PackingRepository.create({ tripId: 'src', label: 'Camera', checked: true, order: 0, weightGrams: 500 })
    const id2 = await PackingRepository.create({ tripId: 'src', label: 'Charger', checked: false, order: 1 })
    await PackingRepository.copyFromTrip('src', 'dest')
    const copied = await db.packingItems.where('tripId').equals('dest').toArray()
    expect(copied).toHaveLength(2)
    expect(copied.every(i => i.checked === false)).toBe(true)
    expect(copied.find(i => i.label === 'Camera')?.weightGrams).toBe(500)
    expect(copied.every(i => i.id !== id1 && i.id !== id2)).toBe(true)
  })
})

describe('PackingRepository.getTotalWeightGrams', () => {
  it('sums weights of all items (checked and unchecked)', async () => {
    await PackingRepository.create({ tripId: 'trip1', label: 'A', checked: false, order: 0, weightGrams: 300 })
    await PackingRepository.create({ tripId: 'trip1', label: 'B', checked: true, order: 1, weightGrams: 200 })
    await PackingRepository.create({ tripId: 'trip1', label: 'C', checked: false, order: 2 }) // no weight
    const total = await PackingRepository.getTotalWeightGrams('trip1')
    expect(total).toBe(500)
  })
})
