import { IonIcon, IonButton } from '@ionic/react'
import { trashOutline } from 'ionicons/icons'
import type { PackingItem } from '../../../db/schema'
import { PackingRepository } from '../../../db/repositories/PackingRepository'

interface Props { item: PackingItem }

const PackingItemRow: React.FC<Props> = ({ item }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0.6rem 1rem',
    opacity: item.checked ? 0.45 : 1,
    borderBottom: '1px solid var(--ion-color-light-shade)',
  }}>
    <input
      type="checkbox"
      checked={item.checked}
      onChange={() => PackingRepository.toggleChecked(item.id)}
      style={{ width: 18, height: 18, flexShrink: 0 }}
    />
    <span style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none' }}>
      {item.label}
    </span>
    {item.weightGrams && (
      <span style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>
        {item.weightGrams}g
      </span>
    )}
    <IonButton fill="clear" size="small" color="danger" onClick={() => PackingRepository.delete(item.id)}>
      <IonIcon icon={trashOutline} />
    </IonButton>
  </div>
)

export default PackingItemRow
