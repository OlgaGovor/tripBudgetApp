import { useState, useEffect, useRef } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonItem, IonLabel, IonInput, IonSpinner,
} from '@ionic/react'
import { StopRepository } from '../../../db/repositories/StopRepository'
import type { Stop } from '../../../db/schema'
import { searchPlaces, type PlaceResult } from '../../../lib/geocoding'

interface Props {
  isOpen: boolean
  onDismiss: () => void
  tripId: string
  dayId?: string
  stop?: Stop
}

const StopFormModal: React.FC<Props> = ({ isOpen, onDismiss, tripId: _tripId, dayId, stop }) => {
  const [placeName, setPlaceName] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [placeLink, setPlaceLink] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLIonInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    if (stop) {
      setPlaceName(stop.placeName)
      setLat(stop.lat)
      setLng(stop.lng)
      setPlaceLink(stop.placeLink ?? '')
    } else {
      setPlaceName(''); setLat(undefined); setLng(undefined); setPlaceLink('')
    }
    setResults([]); setShowDropdown(false)
  }, [stop, isOpen])

  function handlePlaceInput(value: string) {
    setPlaceName(value)
    setLat(undefined)
    setLng(undefined)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setResults([]); setShowDropdown(false); return }
    setShowDropdown(true)
    debounceRef.current = setTimeout(async () => {
      if (!navigator.onLine) { setResults([]); return }
      setSearching(true)
      try { setResults(await searchPlaces(value)) }
      catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
  }

  function selectResult(r: PlaceResult) {
    setPlaceName(r.displayName.split(',')[0].trim())
    setLat(r.lat); setLng(r.lng)
    setShowDropdown(false); setResults([])
  }

  function selectFreeText() {
    setLat(undefined); setLng(undefined)
    setShowDropdown(false); setResults([])
  }

  async function handleSave() {
    if (!placeName.trim()) return
    if (stop) {
      await StopRepository.update(stop.id, { placeName, lat, lng, placeLink: placeLink || undefined })
    } else {
      const existingStops = await StopRepository.getByDayId(dayId!)
      await StopRepository.create({
        dayId: dayId!, order: existingStops.length,
        placeName, lat, lng, placeLink: placeLink || undefined, usefulLinks: [],
      })
    }
    onDismiss()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} onDidPresent={() => inputRef.current?.setFocus()}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onDismiss}>Cancel</IonButton></IonButtons>
          <IonTitle>{stop ? 'Edit Stop' : 'Add Stop'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={handleSave} disabled={!placeName.trim()}>Save</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ position: 'relative' }}>
          <IonItem>
            <IonLabel position="stacked">Place</IonLabel>
            <IonInput
              ref={inputRef}
              value={placeName}
              onIonInput={e => handlePlaceInput(e.detail.value ?? '')}
              onIonBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search or type a place name..."
            />
          </IonItem>
          {lat
            ? <p style={{ padding: '2px 1rem 0', margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>📍 {lat.toFixed(4)}, {lng?.toFixed(4)}</p>
            : placeName && !showDropdown
              ? <p style={{ padding: '2px 1rem 0', margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-warning)' }}>Not pinned on map</p>
              : null
          }

          {showDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'var(--ion-background-color, #fff)',
              border: '1px solid var(--ion-color-light-shade)',
              borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              maxHeight: 260, overflowY: 'auto',
            }}>
              <div
                onPointerDown={selectFreeText}
                style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--ion-color-light)' }}
              >
                <span style={{ fontSize: '1rem' }}>✏️</span>
                <span style={{ fontSize: '0.9rem' }}>Use &ldquo;{placeName.trim()}&rdquo;</span>
              </div>

              {searching && (
                <div style={{ padding: '12px', textAlign: 'center' }}>
                  <IonSpinner name="crescent" style={{ width: 20, height: 20 }} />
                </div>
              )}

              {!searching && results.map((r, i) => (
                <div
                  key={i}
                  onPointerDown={() => selectResult(r)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer',
                    borderBottom: i < results.length - 1 ? '1px solid var(--ion-color-light)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{r.displayName.split(',')[0]}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>{r.displayName}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <IonItem>
          <IonLabel position="stacked">Website / booking link</IonLabel>
          <IonInput value={placeLink} onIonInput={e => setPlaceLink(e.detail.value ?? '')} placeholder="https://..." />
        </IonItem>
      </IonContent>
    </IonModal>
  )
}

export default StopFormModal
