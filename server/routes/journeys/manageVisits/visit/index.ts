import { Router } from 'express'
import type { Services } from '../../../../services'
import createRoutes from './createRoutes'
import amendRoutes from './amendRoutes'
import cancelRoutes from './cancelRoutes'
import insertJourneyIdentifier from '../../../../middleware/insertJourneyIdentifier'
import journeyDataMiddleware from '../../../../middleware/journeyDataMiddleware'
import initialiseJourney from './middleware/initialiseJourney'
import insertJourneyModeContext from '../../../../middleware/insertJourneyModeContext'

export default function Index(services: Services): Router {
  const router = Router({ mergeParams: true })

  router.use('/create/', insertJourneyModeContext('create'), insertJourneyIdentifier())
  router.use(
    '/create/:journeyId',
    insertJourneyModeContext('create'),
    journeyDataMiddleware('officialVisit'),
    createRoutes(services),
  )

  router.use('/amend/:officialVisitId', insertJourneyModeContext('amend'), insertJourneyIdentifier())
  router.use(
    '/amend/:officialVisitId/:journeyId',
    insertJourneyModeContext('amend'),
    journeyDataMiddleware('officialVisit'),
    initialiseJourney(services),
    amendRoutes(services),
  )

  router.use('/cancel/:officialVisitId', insertJourneyModeContext('cancel'), insertJourneyIdentifier())
  router.use(
    '/cancel/:officialVisitId/:journeyId',
    insertJourneyModeContext('cancel'),
    journeyDataMiddleware('officialVisit'),
    initialiseJourney(services),
    cancelRoutes(services),
  )

  return router
}
