import { beforeEach, describe, it, expect } from 'vitest'
import { db } from '../../db'
import { SettingsRepository } from '../SettingsRepository'

beforeEach(async () => { await db.userSettings.clear() })

describe('SettingsRepository.get', () => {
  it('returns defaults when no settings exist', async () => {
    const s = await SettingsRepository.get()
    expect(s.firstDayOfWeek).toBe('monday')
    expect(s.googleConnected).toBe(false)
    expect(s.syncCondition).toBe('wifi')
  })
})

describe('SettingsRepository.update', () => {
  it('persists partial updates', async () => {
    await SettingsRepository.update({ firstDayOfWeek: 'sunday' })
    const s = await SettingsRepository.get()
    expect(s.firstDayOfWeek).toBe('sunday')
    expect(s.googleConnected).toBe(false) // unchanged
  })

  it('merges multiple updates', async () => {
    await SettingsRepository.update({ firstDayOfWeek: 'sunday' })
    await SettingsRepository.update({ googleConnected: true })
    const s = await SettingsRepository.get()
    expect(s.firstDayOfWeek).toBe('sunday')
    expect(s.googleConnected).toBe(true)
  })
})
