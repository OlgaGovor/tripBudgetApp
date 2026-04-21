import { useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonList,
  IonButtons, IonButton, IonIcon, IonSpinner,
} from '@ionic/react'
import { homeOutline } from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { SettingsRepository } from '../../../db/repositories/SettingsRepository'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'
import { requestSignIn, requestTokenQuiet, signOut, isSignedIn, fetchUserEmail } from '../../../sync/GoogleDriveSync'
import { syncNow } from '../../../sync/SyncManager'
import CategoryEditor from './CategoryEditor'
import DataManagementSection from './DataManagementSection'

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: '1.25rem 1rem 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ion-color-medium)', letterSpacing: 1 }}>
    {title}
  </div>
)

const SettingsPage: React.FC = () => {
  const history = useHistory()
  const settings = SettingsRepository.use()
  const categories = ExpenseCategoryRepository.useAll() ?? []
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<'ok' | 'error' | null>(null)

  async function handleSyncNow() {
    setSyncing(true)
    setSyncResult(null)
    try {
      if (!isSignedIn()) {
        await new Promise<void>((resolve, reject) =>
          requestTokenQuiet(resolve, reject, settings?.googleEmail)
        )
      }
      await syncNow()
      setSyncResult('ok')
      if (!settings?.googleEmail) {
        fetchUserEmail().then(email => { if (email) SettingsRepository.update({ googleEmail: email }) })
      }
    } catch {
      setSyncResult('error')
    } finally {
      setSyncing(false)
    }
  }

  if (!settings) return null

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/')}>
              <IonIcon icon={homeOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <SectionHeader title="ACCOUNT & SYNC" />
        <IonList>
          <IonItem>
            <IonLabel>
              <div>Google Drive {settings.googleConnected ? 'connected' : ''}</div>
              {settings.googleEmail && <div style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)' }}>{settings.googleEmail}</div>}
            </IonLabel>
            {settings.googleConnected
              ? <IonButton slot="end" fill="outline" color="danger" onClick={async () => { signOut(); await SettingsRepository.update({ googleConnected: false, googleEmail: undefined }) }}>Sign out</IonButton>
              : <IonButton slot="end" fill="outline" onClick={() => requestSignIn(async () => {
                  const email = await fetchUserEmail()
                  await SettingsRepository.update({ googleConnected: true, ...(email ? { googleEmail: email } : {}) })
                  syncNow().catch(() => {})
                })}>Sign in</IonButton>
            }
          </IonItem>
          {settings.lastSyncedAt && (
            <IonItem>
              <IonLabel color="medium">Last synced: {new Date(settings.lastSyncedAt).toLocaleString()}</IonLabel>
            </IonItem>
          )}
          <IonItem>
            <IonLabel>Sync over</IonLabel>
            <IonSelect
              value={settings.syncCondition}
              onIonChange={e => SettingsRepository.update({ syncCondition: e.detail.value })}
              disabled={!settings.googleConnected}
            >
              <IonSelectOption value="wifi">Wi-Fi only</IonSelectOption>
              <IonSelectOption value="wifi_and_mobile">Wi-Fi + mobile data</IonSelectOption>
              <IonSelectOption value="manual">Manual only</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem lines="none">
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 4px' }}>
              <IonButton
                expand="block"
                style={{ width: '100%', maxWidth: 280, '--background': '#5b9bd5', '--background-activated': '#4a8bc4' } as any}
                disabled={!settings.googleConnected || syncing}
                onClick={handleSyncNow}
              >
                {syncing ? <IonSpinner name="crescent" style={{ width: 18, height: 18 }} /> : 'Sync now'}
              </IonButton>
              {!syncing && syncResult === 'error' && <span style={{ fontSize: '0.8rem', color: 'var(--ion-color-danger)', marginTop: 6 }}>Sync failed — check connection</span>}
            </div>
          </IonItem>
        </IonList>

        <SectionHeader title="PREFERENCES" />
        <IonList>
          <IonItem>
            <IonLabel>First day of week</IonLabel>
            <IonSelect
              value={settings.firstDayOfWeek}
              onIonChange={e => SettingsRepository.update({ firstDayOfWeek: e.detail.value })}
            >
              <IonSelectOption value="monday">Monday</IonSelectOption>
              <IonSelectOption value="sunday">Sunday</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        <SectionHeader title="EXPENSE CATEGORIES" />
        <CategoryEditor categories={categories} />

        <SectionHeader title="DATA MANAGEMENT" />
        <DataManagementSection />

        <SectionHeader title="APP" />
        <IonList>
          <IonItem>
            <IonLabel color="medium">Theme</IonLabel>
            <span slot="end" style={{ fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>Follows system</span>
          </IonItem>
          <IonItem>
            <IonLabel color="medium">Version</IonLabel>
            <span slot="end" style={{ fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>1.0.0</span>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  )
}

export default SettingsPage
