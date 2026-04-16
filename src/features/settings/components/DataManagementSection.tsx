import { IonList, IonItem, IonLabel, useIonAlert } from '@ionic/react'
import { exportAll, importAll, downloadJson, readJsonFile } from '../../../lib/exportImport'

const DataManagementSection: React.FC = () => {
  const [present] = useIonAlert()

  async function handleExportAll() {
    const json = await exportAll()
    downloadJson(json, `tripbudget-backup-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function handleImport() {
    try {
      const json = await readJsonFile()
      present({
        header: 'Import data',
        message: 'Replace all local data, or merge with existing?',
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Merge', handler: () => importAll(json, 'merge') },
          { text: 'Replace', role: 'destructive', handler: () => importAll(json, 'replace') },
        ],
      })
    } catch {
      // user cancelled file picker — no-op
    }
  }

  async function handleClearAll() {
    present({
      header: 'Clear all data',
      message: 'This will delete all trips and settings from this device. This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete everything', role: 'destructive',
          handler: async () => {
            const { db } = await import('../../../db/db')
            await Promise.all([
              db.trips.clear(), db.days.clear(), db.stops.clear(),
              db.transportLegs.clear(), db.accommodations.clear(),
              db.expenses.clear(), db.packingItems.clear(),
            ])
          },
        },
      ],
    })
  }

  return (
    <IonList>
      <IonItem button onClick={handleExportAll}>
        <IonLabel>Export all data (JSON)</IonLabel>
      </IonItem>
      <IonItem button onClick={handleImport}>
        <IonLabel>Import from JSON</IonLabel>
      </IonItem>
      <IonItem button onClick={handleClearAll}>
        <IonLabel color="danger">Clear all local data</IonLabel>
      </IonItem>
    </IonList>
  )
}

export default DataManagementSection
