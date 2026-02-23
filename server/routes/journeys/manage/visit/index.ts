import { Router } from 'express'
import type { Services } from '../../../../services'
import createRoutes from './createRoutes'
import amendRoutes from './amendRoutes'
import insertJourneyIdentifier from '../../../../middleware/journey/insertJourneyIdentifier'
import journeyDataMiddleware from '../../../../middleware/journey/journeyDataMiddleware'
import initialiseJourney from './middleware/initialiseJourney'
import insertJourneyModeContext from '../../../../middleware/journey/insertJourneyModeContext'
import { requirePermissions } from '../../../../middleware/requirePermissions'
import { Permission } from '../../../../interfaces/hmppsUser'

export default function Index(services: Services): Router {
  const router = Router({ mergeParams: true })

  router.use(
    '/create/',
    requirePermissions('OV', Permission.MANAGE),
    insertJourneyModeContext('create'),
    insertJourneyIdentifier(),
  )
  router.use(
    '/create/:journeyId',
    insertJourneyModeContext('create'),
    journeyDataMiddleware('officialVisit'),
    createRoutes(services),
  )

  router.use(
    '/amend/:ovId',
    requirePermissions('OV', Permission.MANAGE),
    insertJourneyModeContext('amend'),
    insertJourneyIdentifier(),
  )

  router.use(
    '/amend/:ovId/:journeyId',
    requirePermissions('OV', Permission.MANAGE),
    insertJourneyModeContext('amend'),
    journeyDataMiddleware('amendVisit'),
    amendRoutes(services),
  )

  return router
}
