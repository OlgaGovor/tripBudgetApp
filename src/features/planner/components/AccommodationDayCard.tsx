// src/features/planner/components/AccommodationDayCard.tsx
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { pencilOutline, trashOutline } from 'ionicons/icons'
import type { Accommodation } from '../../../db/schema'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import AccommodationFormModal from './AccommodationFormModal'

const STATUS_COLORS: Record<Accommodation['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

interface Props {
  accommodation?: Accommodation
  tripId: string
  initialDate?: string
}

const AccommodationDayCard: React.FC<Props> = ({ accommodation, tripId, initialDate }) => {
  const [showForm, setShowForm] = useState(false)

  if (!accommodation) {
    return (
      <>
        <div
          onClick={() => setShowForm(true)}
          style={{
            margin: '5px 10px', padding: '7px 10px',
            borderRadius: 6, border: '1px dashed #b2dfdb', borderLeft: '3px solid #b2dfdb',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '1rem', opacity: 0.4 }}>🏨</span>
          <span style={{ color: '#16a085', fontWeight: 500 }}>＋ Add accommodation</span>
        </div>
        <AccommodationFormModal
          isOpen={showForm}
          onDismiss={() => setShowForm(false)}
          tripId={tripId}
          initialDate={initialDate}
        />
      </>
    )
  }

  async function handleDelete() {
    await AccommodationRepository.delete(accommodation!.id)
  }

  return (
    <>
      <div style={{
        margin: '5px 10px', padding: '7px 10px',
        background: 'rgba(22,160,133,0.08)', borderRadius: 6,
        borderLeft: '3px solid #16a085',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>🏨</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#444' }}>{accommodation.name}</div>
          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 1 }}>
            {fmtDate(accommodation.checkIn)} → {fmtDate(accommodation.checkOut)}
          </div>
        </div>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[accommodation.status], flexShrink: 0 }} />
        <IonButton fill="clear" size="small" onClick={() => setShowForm(true)}>
          <IonIcon icon={pencilOutline} />
        </IonButton>
        <IonButton fill="clear" size="small" color="danger" onClick={handleDelete}>
          <IonIcon icon={trashOutline} />
        </IonButton>
      </div>
      <AccommodationFormModal
        isOpen={showForm}
        onDismiss={() => setShowForm(false)}
        tripId={tripId}
        accommodation={accommodation}
      />
    </>
  )
}

export default AccommodationDayCard
