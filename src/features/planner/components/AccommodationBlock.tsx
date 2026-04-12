import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { pencilOutline, trashOutline } from 'ionicons/icons'
import type { Accommodation } from '../../../db/schema'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import AccommodationFormModal from './AccommodationFormModal'

const STATUS_COLORS: Record<Accommodation['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

interface Props { accommodation: Accommodation }

const AccommodationBlock: React.FC<Props> = ({ accommodation }) => {
  const [showForm, setShowForm] = useState(false)

  async function handleDelete() {
    await AccommodationRepository.delete(accommodation.id)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0.4rem 1rem', background: 'var(--ion-color-light)', borderRadius: 8, margin: '0.25rem 1rem',
    }}>
      <span>🏨</span>
      <span style={{ flex: 1, fontSize: '0.9rem' }}>
        {accommodation.name}
        {accommodation.link && (
          <a href={accommodation.link} target="_blank" rel="noreferrer" style={{ marginLeft: 6, fontSize: '0.75rem' }}>🔗</a>
        )}
        {accommodation.notes && (
          <div style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)', marginTop: 2, whiteSpace: 'pre-wrap' }}>
            {accommodation.notes}
          </div>
        )}
      </span>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[accommodation.status] }} />
      <IonButton fill="clear" size="small" onClick={() => setShowForm(true)}>
        <IonIcon icon={pencilOutline} />
      </IonButton>
      <IonButton fill="clear" size="small" color="danger" onClick={handleDelete}>
        <IonIcon icon={trashOutline} />
      </IonButton>
      <AccommodationFormModal
        isOpen={showForm}
        onDismiss={() => setShowForm(false)}
        tripId={accommodation.tripId}
        accommodation={accommodation}
      />
    </div>
  )
}

export default AccommodationBlock
