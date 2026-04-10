import { IonButton, IonIcon } from '@ionic/react'
import { trashOutline } from 'ionicons/icons'
import type { TransportLeg } from '../../../db/schema'
import { TransportLegRepository, isOvernightTransport } from '../../../db/repositories/TransportLegRepository'

const METHOD_ICONS: Record<TransportLeg['method'], string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}
const STATUS_COLORS: Record<TransportLeg['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

interface Props { leg: TransportLeg }

const TransportLegItem: React.FC<Props> = ({ leg }) => {
  async function handleDelete() {
    await TransportLegRepository.delete(leg.id)
  }

  const overnight = isOvernightTransport(leg)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.3rem 0', fontSize: '0.85rem' }}>
      <span>{METHOD_ICONS[leg.method]}</span>
      {leg.departureDateTime && <span>{leg.departureDateTime.slice(11, 16)}</span>}
      {leg.arrivalDateTime && <span>→ {leg.arrivalDateTime.slice(11, 16)}</span>}
      {overnight && <span style={{ fontSize: '0.7rem', background: '#9b59b6', color: '#fff', borderRadius: 4, padding: '1px 4px' }}>overnight</span>}
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[leg.status] }} />
      <IonButton fill="clear" size="small" color="danger" onClick={handleDelete}>
        <IonIcon icon={trashOutline} />
      </IonButton>
    </div>
  )
}

export default TransportLegItem
