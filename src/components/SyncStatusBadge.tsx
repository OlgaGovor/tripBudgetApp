import { useSyncStatus } from '../hooks/useSyncStatus'
import type { SyncStatus } from '../sync/SyncManager'

const LABELS: Record<SyncStatus, string> = {
  synced: '✅ Synced',
  syncing: '🔄 Syncing',
  offline: '⚠️ Offline',
  error: '🔴 Sync error',
}

const SyncStatusBadge: React.FC = () => {
  const status = useSyncStatus()
  if (status === 'synced') return null
  return (
    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.05)' }}>
      {LABELS[status]}
    </span>
  )
}

export default SyncStatusBadge
