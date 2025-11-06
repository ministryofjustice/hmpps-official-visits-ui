import { NotFound } from 'http-errors'
import { randomUUID } from 'crypto'
import express, { Express, RequestHandler } from 'express'
import { Journey } from '../../@types/express'
import routes from '../index'
import nunjucksSetup from '../../utils/nunjucksSetup'
import errorHandler from '../../errorHandler'
import type { Services } from '../../services'
import AuditService from '../../services/auditService'
import { HmppsUser } from '../../interfaces/hmppsUser'
import setUpWebSession from '../../middleware/setUpWebSession'
import { Breadcrumbs } from '../../middleware/breadcrumbs'
import OfficialVisitsService from '../../services/officialVisitsService'
import PrisonerService from '../../services/prisonerService'
import LocationsService from '../../services/locationsService'
import { testUtilRoutes } from './testUtilRoute'
import setUpFlash from '../../middleware/setUpFlash'

jest.mock('../../services/auditService')
jest.mock('../../services/prisonerService')
jest.mock('../../services/locationsService')
jest.mock('../../services/officialVisitsService')

export const journeyId = () => '9211b69b-826f-4f48-a43f-8af59dddf39f'

export const user: HmppsUser = {
  name: 'FIRST LAST',
  userId: 'id',
  token: 'token',
  username: 'user1',
  displayName: 'First Last',
  authSource: 'nomis',
  staffId: 1234,
  userRoles: ['ROLE_PRISON'],
}

export const flashProvider = jest.fn()

function appSetup(
  services: Services,
  production: boolean,
  userSupplier: () => HmppsUser,
  journeySessionSupplier: () => Journey,
  middlewares: RequestHandler[],
): Express {
  const app = express()

  app.set('view engine', 'njk')

  flashProvider.mockReturnValue([])

  app.use(setUpWebSession())
  app.use((req, res, next) => {
    req.user = userSupplier() as Express.User
    req.flash = flashProvider
    req.session.journey = journeySessionSupplier()
    req.session.journeyData = {}
    req.session.journeyData[journeyId()] = { instanceUnixEpoch: Date.now(), ...journeySessionSupplier() }
    res.locals = {
      user: { ...req.user } as HmppsUser,
      breadcrumbs: new Breadcrumbs(res),
    }
    next()
  })
  app.use((req, res, next) => {
    req.id = randomUUID()
    next()
  })
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  nunjucksSetup(app)
  middlewares.forEach(mw => app.use(mw))
  app.use(setUpFlash())
  app.use(routes(services))
  app.use(testUtilRoutes())
  app.use((req, res, next) => next(new NotFound()))
  app.use(errorHandler(production))

  return app
}

export function appWithAllRoutes({
  production = false,
  services = {},
  userSupplier = () => user,
  journeySessionSupplier = () => ({}),
  middlewares = [],
}: {
  production?: boolean
  services?: Partial<Services>
  userSupplier?: () => HmppsUser
  journeySessionSupplier?: () => Journey
  middlewares?: RequestHandler[]
}): Express {
  // Default mocked services - but can be overridden by alternatives supplied
  const allServices = {
    auditService: new AuditService(null) as jest.Mocked<AuditService>,
    prisonerService: new PrisonerService(null) as jest.Mocked<PrisonerService>,
    officialVisitsService: new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>,
    locationsService: new LocationsService(null) as jest.Mocked<LocationsService>,
    ...services,
  } as Services

  return appSetup(allServices, production, userSupplier, journeySessionSupplier, middlewares)
}
