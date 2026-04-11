import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react'
import { calendarOutline, cashOutline, mapOutline, bagHandleOutline, listOutline } from 'ionicons/icons'
import { Redirect, Route, useRouteMatch } from 'react-router-dom'
import PlannerPage from '../features/planner/components/PlannerPage'
import CalendarPage from '../features/calendar/components/CalendarPage'
import ExpensesPage from '../features/expenses/components/ExpensesPage'

// Placeholders for tabs built in Plan 2
const MapPage: React.FC = () => <div>Map</div>
const PackingPage: React.FC = () => <div>Packing</div>

const TripShell: React.FC = () => {
  const { url, path, params } = useRouteMatch<{ tripId: string }>()
  const { tripId } = params

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path={`${path}/plan`} component={PlannerPage} />
        <Route exact path={`${path}/calendar`} component={CalendarPage} />
        <Route exact path={`${path}/expenses`} component={ExpensesPage} />
        <Route exact path={`${path}/map`} component={MapPage} />
        <Route exact path={`${path}/packing`} component={PackingPage} />
        <Route exact path={path} render={() => <Redirect to={`${url}/plan`} />} />
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
