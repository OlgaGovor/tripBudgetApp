import { useEffect, useState } from 'react'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButtons, IonButton, IonIcon } from '@ionic/react'
import { homeOutline } from 'ionicons/icons'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { useParams, useHistory } from 'react-router-dom'
import { useMapData } from '../hooks/useMapData'
import { fetchRoadRoute, greatCircleArc } from '../../../lib/routing'
import type { TransportLeg } from '../../../db/schema'

const LINE_COLOR: Record<string, string> = {
  booked_paid: '#27ae60', booked: '#f39c12', not_booked: '#e74c3c',
}

interface RouteSegment {
  legId: string
  points: [number, number][]
  status: TransportLeg['status']
  dashed: boolean
}

const MapPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const history = useHistory()
  const { stopsWithCoords, unpinnedStops, legs } = useMapData(tripId)
  const [routes, setRoutes] = useState<RouteSegment[]>([])

  useEffect(() => {
    if (!legs.length || !stopsWithCoords.length) { setRoutes([]); return }
    const stopById = new Map(stopsWithCoords.map(s => [s.id, s]))

    async function buildRoutes() {
      const segments: RouteSegment[] = []
      for (const leg of legs) {
        const from = stopById.get(leg.fromStopId)
        const to = stopById.get(leg.toStopId)
        if (!from || !to) continue
        const fromCoord = { lat: from.lat!, lng: from.lng! }
        const toCoord = { lat: to.lat!, lng: to.lng! }
        let points: [number, number][]
        let dashed = false
        try {
          if (leg.method === 'car' || leg.method === 'bus') {
            points = await fetchRoadRoute(fromCoord, toCoord)
          } else if (leg.method === 'plane') {
            points = greatCircleArc(fromCoord, toCoord)
            dashed = true
          } else {
            points = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]]
            dashed = leg.method !== 'train'
          }
        } catch {
          points = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]]
          dashed = true
        }
        segments.push({ legId: leg.id, points, status: leg.status, dashed })
      }
      setRoutes(segments)
    }
    buildRoutes()
  }, [legs, stopsWithCoords])

  const center: [number, number] = stopsWithCoords.length
    ? [stopsWithCoords[0].lat!, stopsWithCoords[0].lng!]
    : [20, 0]

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/')}><IonIcon icon={homeOutline} /></IonButton>
          </IonButtons>
          <IonTitle>Map</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <MapContainer center={center} zoom={stopsWithCoords.length ? 6 : 2} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {stopsWithCoords.map(stop => (
                <Marker key={stop.id} position={[stop.lat!, stop.lng!]}>
                  <Popup>{stop.placeName}</Popup>
                </Marker>
              ))}
              {routes.map(route => (
                <Polyline
                  key={route.legId}
                  positions={route.points}
                  color={LINE_COLOR[route.status]}
                  dashArray={route.dashed ? '6 6' : undefined}
                  weight={2.5}
                  opacity={route.status === 'not_booked' ? 0.5 : 1}
                />
              ))}
            </MapContainer>
          </div>
          {unpinnedStops.length > 0 && (
            <div style={{ maxHeight: 120, overflowY: 'auto', borderTop: '1px solid var(--ion-color-light-shade)', flexShrink: 0 }}>
              <IonList>
                <IonItem>
                  <IonLabel><h3 style={{ fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>Not pinned on map</h3></IonLabel>
                </IonItem>
                {unpinnedStops.map(s => (
                  <IonItem key={s.id}>
                    <IonLabel>📍 {s.placeName}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default MapPage
