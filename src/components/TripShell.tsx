import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react'
import { calendarOutline, cashOutline, mapOutline, bagHandleOutline, listOutline } from 'ionicons/icons'
import { Redirect, Route, useRouteMatch } from 'react-router-dom'
import PlannerPage from '../features/planner/components/PlannerPage'

// Placeholders for tabs built in Plan 2
const CalendarPage: React.FC = () => <div>Calendar</div>
const ExpensesPage: React.FC = () => <div>Expenses</div>
const MapPage: React.FC = () => <div>Map</div>
const PackingPage: React.FC = () => <div>Packing</div>

const TripShell: React.FC = () => {
  const { url, params } = useRouteMatch<{ tripId: string }>()
  const { tripId } = params

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path={`${url}/plan`} component={PlannerPage} />
        <Route exact path={`${url}/calendar`} component={CalendarPage} />
        <Route exact path={`${url}/expenses`} component={ExpensesPage} />
        <Route exact path={`${url}/map`} component={MapPage} />
        <Route exact path={`${url}/packing`} component={PackingPage} />
        <Redirect exact from={url} to={`${url}/plan`} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="plan" href={`/trips/${tripId}/plan`}>
          <IonIcon icon={listOutline} />
          <IonLabel>Plan</IonLabel>
        </IonTabButton>
        <IonTabButton tab="calendar" href={`/trips/${tripId}/calendar`}>
          <IonIcon icon={calendarOutline} />
          <IonLabel>Calendar</IonLabel>
        </IonTabButton>
        <IonTabButton tab="expenses" href={`/trips/${tripId}/expenses`}>
          <IonIcon icon={cashOutline} />
          <IonLabel>Expenses</IonLabel>
        </IonTabButton>
        <IonTabButton tab="map" href={`/trips/${tripId}/map`}>
          <IonIcon icon={mapOutline} />
          <IonLabel>Map</IonLabel>
        </IonTabButton>
        <IonTabButton tab="packing" href={`/trips/${tripId}/packing`}>
          <IonIcon icon={bagHandleOutline} />
          <IonLabel>Packing</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  )
}

export default TripShell
