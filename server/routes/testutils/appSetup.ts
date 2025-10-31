import express, { Express } from 'express'
import { NotFound } from 'http-errors'

import { randomUUID } from 'crypto'
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

jest.mock('../../services/auditService')
jest.mock('../../services/prisonerService')
jest.mock('../../services/locationsService')
jest.mock('../../services/officialVisitsService')

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

function appSetup(services: Services, production: boolean, userSupplier: () => HmppsUser): Express {
  const app = express()

  app.set('view engine', 'njk')

  nunjucksSetup(app)
  app.use(setUpWebSession())
  app.use((req, res, next) => {
    req.user = userSupplier() as Express.User
    req.flash = flashProvider
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
  app.use(routes(services))
  app.use((req, res, next) => next(new NotFound()))
  app.use(errorHandler(production))

  return app
}

export function appWithAllRoutes({
  production = false,
  services = {
    auditService: new AuditService(null) as jest.Mocked<AuditService>,
    locationsService: new LocationsService(null) as jest.Mocked<LocationsService>,
    prisonerService: new PrisonerService(null) as jest.Mocked<PrisonerService>,
    officialVisitsService: new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>,
  },
  userSupplier = () => user,
}: {
  production?: boolean
  services?: Partial<Services>
  userSupplier?: () => HmppsUser
}): Express {
  return appSetup(services as Services, production, userSupplier)
}
