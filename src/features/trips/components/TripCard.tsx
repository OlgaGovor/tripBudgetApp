import type { Trip } from '../../../db/schema'

interface Props {
  trip: Trip
  onClick: () => void
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric' })
  const days = Math.round((new Date(end + 'T00:00:00Z').getTime() - new Date(start + 'T00:00:00Z').getTime()) / 86400000) + 1
  return `${fmt(start)} – ${fmt(end)} · ${days}d`
}

const TripCard: React.FC<Props> = ({ trip, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: trip.coverColor,
      borderRadius: 12,
      padding: '1rem',
      margin: '0.75rem 1rem',
      cursor: 'pointer',
    }}
  >
    <div style={{ fontSize: '2rem' }}>{trip.emoji}</div>
    <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: 600 }}>{trip.name}</h2>
    <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', opacity: 0.7 }}>{trip.destination}</p>
    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>{formatDateRange(trip.startDate, trip.endDate)}</p>
    {(trip.budget.total || trip.budget.dailyAmount) && (
      <div style={{ marginTop: '0.5rem', height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2 }}>
        <div style={{ width: '40%', height: '100%', background: 'var(--ion-color-success)', borderRadius: 2 }} />
      </div>
    )}
  </div>
)

export default TripCard
