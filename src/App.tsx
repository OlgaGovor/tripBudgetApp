import { useEffect } from 'react'
import { IonReactRouter } from '@ionic/react-router'
import { IonRouterOutlet } from '@ionic/react'
import { Route, useHistory } from 'react-router-dom'
import TripsPage from './features/trips/components/TripsPage'
import TripShell from './components/TripShell'
import SettingsPage from './features/settings/components/SettingsPage'
import { TripRepository } from './db/repositories/TripRepository'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || ''

const StartupRedirect: React.FC = () => {
    const history = useHistory()

    useEffect(() => {
        async function findCurrentTrip() {
            const trips = await TripRepository.getAll()

            const now = new Date()
            const today =
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

            const currentTrips = trips.filter(
                trip =>
                    trip.startDate <= today &&
                    trip.endDate >= today
            )

            if (currentTrips.length === 1) {
                history.replace(`/trips/${currentTrips[0].id}`)
            } else {
                history.replace('/trips')
            }
        }

        findCurrentTrip()
    }, [history])

    return null
}

const App: React.FC = () => (
    <IonReactRouter basename={basename}>
        <IonRouterOutlet>
            <Route exact path="/" component={StartupRedirect} />
            <Route exact path="/trips" component={TripsPage} />
            <Route path="/trips/:tripId" component={TripShell} />
            <Route exact path="/settings" component={SettingsPage} />
        </IonRouterOutlet>
    </IonReactRouter>
)

export default App