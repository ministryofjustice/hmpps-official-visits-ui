import { Router } from 'express'
import type { Services } from '../../../services'
import routes from './routes'

export default function Index(services: Services): Router {
  const router = Router({ mergeParams: true })

  router.use('/', routes(services))

  return router
}
