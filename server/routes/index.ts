import { type RequestHandler, Router } from 'express'
import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import { HomePageController } from './journeys/home/homeController'
import prisonerSearch from './journeys/manageVisits/prisonerSearch'
import manageVisits from './journeys/manageVisits/visit'
import viewVisits from './journeys/viewVisits'

export default function routes(_services: Services): Router {
  const router = Router()

  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

  // Home page - single handler
  const homeController = new HomePageController()
  get('/', homeController.GET)

  // Prisoner search routes and handlers
  router.use('/prisoner-search', prisonerSearch(_services))

  // Create, amend or cancel a visit routes and handlers
  router.use('/manage', manageVisits(_services))

  // View visits routes and handlers
  router.use('/view', viewVisits(_services))

  return router
}
