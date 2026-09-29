import express, { Request } from 'express'
import { telemetryMiddleware } from '@ministryofjustice/hmpps-azure-telemetry'

import createError from 'http-errors'

import { getFrontendComponents, retrieveCaseLoadData } from '@ministryofjustice/hmpps-connect-dps-components'

import nunjucksSetup from './utils/nunjucksSetup'
import errorHandler from './errorHandler'
import authorisationMiddleware from './middleware/authorisationMiddleware'
import setUpAuthentication from './middleware/setUpAuthentication'
import setUpCsrf from './middleware/setUpCsrf'
import setUpCurrentUser from './middleware/setUpCurrentUser'
import setUpHealthChecks from './middleware/setUpHealthChecks'
import setUpStaticResources from './middleware/setUpStaticResources'
import setUpWebRequestParsing from './middleware/setupRequestParsing'
import setUpWebSecurity from './middleware/setUpWebSecurity'
import setUpWebSession from './middleware/setUpWebSession'
import breadcrumbs from './middleware/breadcrumbs'
import setUpFlash from './middleware/setUpFlash'
import config from './config'
import routes from './routes'
import type { Services } from './services'
import serviceEnabledMiddleware from './middleware/serviceEnabledMiddleware'

export default function createApp(services: Services): express.Application {
  const app = express()

  app.set('json spaces', 2)
  app.set('trust proxy', true)
  app.set('port', process.env.PORT || 3000)

  app.use(setUpHealthChecks(services.applicationInfo))
  app.use(setUpWebSecurity())
  app.use(setUpWebSession())
  app.use(setUpWebRequestParsing())
  app.use(setUpStaticResources())
  nunjucksSetup(app, services.applicationInfo)
  app.use(setUpAuthentication())
  app.use(authorisationMiddleware(['ROLE_PRISON']))
  app.use(setUpCsrf())
  app.use(setUpFlash())
  app.use(setUpCurrentUser())
  app.use(
    telemetryMiddleware.addUserMetadataToTelemetry({
      getAttributes: (req: Request) => ({ username: req.user?.username }),
    }),
  )

  app.get(
    /(.*)/,
    getFrontendComponents({
      requestOptions: { includeSharedData: true },
      componentApiConfig: config.apis.componentApi,
      dpsUrl: config.serviceUrls.digitalPrison,
    }),
  )

  app.use(retrieveCaseLoadData({ prisonApiConfig: config.apis.prisonApi }))
  app.use(serviceEnabledMiddleware())
  app.use(breadcrumbs())
  app.use(routes(services))

  app.use((_req, _res, next) => next(createError(404, 'Not found')))
  app.use(errorHandler(process.env.NODE_ENV === 'production'))

  return app
}
