import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonList,
  IonButtons, IonButton, IonIcon,
} from '@ionic/react'
import { homeOutline } from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { SettingsRepository } from '../../../db/repositories/SettingsRepository'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'
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
