import { exportTrip } from '../lib/exportImport'
import { uploadFile, downloadFile, listTripFiles, isSignedIn, requestTokenQuiet } from './GoogleDriveSync'
import { SettingsRepository } from '../db/repositories/SettingsRepository'
import { db } from '../db/db'

function tryRefreshTokenSilently(loginHint?: string): Promise<void> {
  return new Promise(resolve => requestTokenQuiet(resolve, resolve, loginHint))
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

type Listener = (status: SyncStatus) => void

let status: SyncStatus = 'synced'
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<Listener>()

export function onSyncStatus(fn: Listener): () => void {
  listeners.add(fn)
  fn(status)
  return () => listeners.delete(fn)
}

function setStatus(s: SyncStatus) {
  status = s
  listeners.forEach(fn => fn(s))
}

export function notifyDataChanged(tripId?: string): void {
  if (!isSignedIn()) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => uploadTrip(tripId), 3_000)
}

async function canSync(): Promise<boolean> {
  const settings = await SettingsRepository.get()
  if (settings.syncCondition === 'manual') return false
  if (!navigator.onLine) return false
  if (settings.syncCondition === 'wifi') {
    const conn = (navigator as any).connection
    if (conn && conn.type && conn.type !== 'wifi') return false
  }
  return true
}

export async function syncNow(): Promise<void> {
  if (!isSignedIn()) throw new Error('Not signed in')
  setStatus('syncing')
  try {
    const { importTrip } = await import('../lib/exportImport')

    // 1. Download first: update local with anything newer from Drive
    const filenames = await listTripFiles()
    const tripFiles = filenames.filter(f => f.startsWith('trip_') && f.endsWith('.json'))
    for (const filename of tripFiles) {
      const json = await downloadFile(filename)
      if (!json) continue
      const bundle = JSON.parse(json)
      if (!bundle.trip?.id || !bundle.trip?.updatedAt) continue
      const local = await db.trips.get(bundle.trip.id)
      if (local && local.updatedAt >= bundle.trip.updatedAt) continue
      await importTrip(json, 'replace')
    }

    // 2. Upload after: local now has the freshest data for every trip
    const trips = await db.trips.toArray()
    for (const t of trips) {
      const json = await exportTrip(t.id)
      await uploadFile(`trip_${t.id}.json`, json)
    }

    await SettingsRepository.update({ lastSyncedAt: new Date().toISOString() })
    setStatus('synced')
  } catch (e) {
    setStatus(navigator.onLine ? 'error' : 'offline')
    throw e
  }
}

export async function uploadTrip(tripId?: string): Promise<void> {
  if (!isSignedIn() || !(await canSync())) return
  setStatus('syncing')
  try {
    if (tripId) {
      const json = await exportTrip(tripId)
      await uploadFile(`trip_${tripId}.json`, json)
    } else {
      const trips = await db.trips.toArray()
      for (const t of trips) {
        const json = await exportTrip(t.id)
        await uploadFile(`trip_${t.id}.json`, json)
      }
    }
    await SettingsRepository.update({ lastSyncedAt: new Date().toISOString() })
    setStatus('synced')
  } catch {
    setStatus(navigator.onLine ? 'error' : 'offline')
  }
}

export async function downloadAll(): Promise<void> {
  const settings = await SettingsRepository.get()
  if (!settings.googleConnected) return
  if (!(await canSync())) return
  await tryRefreshTokenSilently(settings.googleEmail)
  if (!isSignedIn()) return
  setStatus('syncing')
  try {
    const filenames = await listTripFiles()
    const tripFiles = filenames.filter(f => f.startsWith('trip_') && f.endsWith('.json'))
    const { importTrip } = await import('../lib/exportImport')
    for (const filename of tripFiles) {
      const json = await downloadFile(filename)
      if (!json) continue
      const bundle = JSON.parse(json)
      if (!bundle.trip?.id || !bundle.trip?.updatedAt) continue
      const local = await db.trips.get(bundle.trip.id)
      if (local && local.updatedAt >= bundle.trip.updatedAt) continue
      await importTrip(json, 'replace')
    }
    await SettingsRepository.update({ lastSyncedAt: new Date().toISOString() })
    setStatus('synced')
  } catch {
    setStatus(navigator.onLine ? 'error' : 'offline')
  }
}

export function startAutoSync(): () => void {
  function handleVisibility() {
    if (document.visibilityState === 'visible') downloadAll()
  }
  if (!navigator.onLine) setStatus('offline')
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('offline', () => setStatus('offline'))
  window.addEventListener('online', () => { if (isSignedIn()) setStatus('synced') })
  return () => {
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}
