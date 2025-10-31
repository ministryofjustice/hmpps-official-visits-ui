import { Router } from 'express'

import type { Services } from '../../../../services'
import routes from './routes'

import insertJourneyIdentifier from '../../../../middleware/insertJourneyIdentifier'
import journeyDataMiddleware from '../../../../middleware/journeyDataMiddleware'

export default function Index(services: Services): Router {
  const router = Router({ mergeParams: true })

  router.use('/', insertJourneyIdentifier())
  router.use('/:journeyId', journeyDataMiddleware('prisonerSearch'), routes(services))

  return router
}
