import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { UserSettings } from '../schema'

const DEFAULTS: UserSettings = {
  id: 'singleton',
  firstDayOfWeek: 'monday',
  syncCondition: 'wifi',
  googleConnected: false,
}

export const SettingsRepository = {
  use() {
    return useLiveQuery(() => SettingsRepository.get(), [])
  },

  async get(): Promise<UserSettings> {
    const s = await db.userSettings.get('singleton')
    return s ?? { ...DEFAULTS }
  },

  async update(updates: Partial<Omit<UserSettings, 'id'>>): Promise<void> {
    const current = await SettingsRepository.get()
    await db.userSettings.put({ ...current, ...updates, id: 'singleton' })
  },
}
