import { useEffect, useState } from 'react'
import { onSyncStatus, type SyncStatus } from '../sync/SyncManager'

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>('synced')
  useEffect(() => {
    const unsub = onSyncStatus(setStatus)
    return unsub
  }, [])
  return status
}
