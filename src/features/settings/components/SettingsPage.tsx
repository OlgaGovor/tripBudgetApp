import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonList,
  IonButtons, IonButton, IonIcon,
} from '@ionic/react'
import { homeOutline } from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { SettingsRepository } from '../../../db/repositories/SettingsRepository'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'
import { requestSignIn, signOut } from '../../../sync/GoogleDriveSync'
import { uploadTrip } from '../../../sync/SyncManager'
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
            <IonLabel>{settings.googleConnected ? 'Google Drive connected' : 'Google Drive'}</IonLabel>
            {settings.googleConnected
              ? <IonButton slot="end" fill="outline" color="danger" onClick={async () => { signOut(); await SettingsRepository.update({ googleConnected: false }) }}>Sign out</IonButton>
              : <IonButton slot="end" fill="outline" onClick={() => requestSignIn()}>Sign in</IonButton>
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
          <IonItem button onClick={() => uploadTrip()} disabled={!settings.googleConnected}>
            <IonLabel>Sync now</IonLabel>
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
