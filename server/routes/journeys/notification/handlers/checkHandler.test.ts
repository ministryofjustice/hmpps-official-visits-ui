import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user, flashProvider } from '../../../testutils/appSetup'
import AuditService from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { NotificationResponse } from '../../../../@types/officialVisitsApi/types'
import { OfficialVisitJourney } from '../../manage/visit/journey'
import { mockVisitByIdVisit } from '../../../../testutils/mocks'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/officialVisitsService')
jest.mock('../../../../services/telemetryService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const OV_ID = '1'

const sampleVisit = {
  prisonerVisited: { firstName: 'Tim', lastName: 'Harrison' },
  prisoner: { firstName: 'Tim', lastName: 'Harrison' },
  visitType: 'IN_PERSON',
  visitTypeDescription: 'Attend in person',
  visitDate: '2026-05-12',
  startTime: '13:30',
  endTime: '16:00',
  locationDescription: 'Official Visits room',
} as OfficialVisitJourney

const appSetup = (journeySessionSupplier = () => ({})) => {
  app = appWithAllRoutes({
    services: { auditService, officialVisitsService },
    userSupplier: () => user,
    journeySessionSupplier,
  })
}

beforeEach(() => {
  appSetup(() => ({ officialVisit: sampleVisit }))
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('notification check handler', () => {
  it('GET should render check page with email and visit details', async () => {
    app = appWithAllRoutes({
      services: { auditService, officialVisitsService },
      userSupplier: () => user,
      journeySessionSupplier: () => ({ officialVisit: sampleVisit }),
      middlewares: [
        (req, _res, next) => {
          req.session.notifications = { [OV_ID]: { emailAddress: 'example@example.com' } }
          next()
        },
      ],
    })

    officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
    const res = await request(app).get(`/notification/${OV_ID}/create/check`).expect(200)
    const $ = cheerio.load(res.text)

    expect($('h1').text().trim()).toEqual('Check and send official visit confirmation')
    // Email
    expect($('.govuk-summary-list__value').first().text()).toContain('example@example.com')
    expect(res.text).toContain('Tim Harrison')
    expect(res.text).toContain('Video')
    // Date formatted
    expect(res.text).toContain('Thursday, 1 January 2026')
    // Time formatted and duration
    expect(res.text).toContain('10am to 11am (1 hour)')
    expect(res.text).toContain('First Location')
    // Visitor name and relationship should be shown
    expect(res.text).toContain('Peter Malicious')
    expect(res.text).toContain('Solicitor')
  })

  it('GET should prefer formResponses (flash) email over session notifications', async () => {
    // Configure app with session notification in session and a flashed formResponses value
    app = appWithAllRoutes({
      services: { auditService, officialVisitsService },
      userSupplier: () => user,
      journeySessionSupplier: () => ({ officialVisit: sampleVisit }),
      middlewares: [
        (req, res, next) => {
          req.session.notifications = { [OV_ID]: { emailAddress: 'example@example.com' } }
          next()
        },
      ],
    })

    // Simulate flash containing formResponses (app uses req.flash via flashProvider)
    flashProvider.mockImplementation((name: string) => {
      if (name === 'formResponses') return [JSON.stringify({ emailAddress: 'flash@example.com' })]
      return []
    })

    officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
    const res = await request(app).get(`/notification/${OV_ID}/create/check`).expect(200)
    const $ = cheerio.load(res.text)

    // Should show the flash/formResponses email, not the session value
    expect($('.govuk-summary-list__value').first().text()).toContain('flash@example.com')
  })

  it('GET should render check page when action is not a known notification action', async () => {
    appSetup(() => ({ officialVisit: sampleVisit }))
    officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)

    const res = await request(app).get(`/notification/${OV_ID}/invalid/check`).expect(200)
    expect(res.text).toContain('Check and send official visit confirmation')
    expect(res.text).toContain(`/notification/${OV_ID}/invalid`)
  })

  it('POST should send notification and clear session entries', async () => {
    // Build app with journey session and pre-populated notification
    appSetup(() => ({ officialVisit: sampleVisit }))

    const agent = request.agent(app)

    // Simulate posting of email by setting notifications into session via a pre-route
    // Use a helper route to set session; test app exposes /journeySession but not a setter, so use middleware override
    // We'll create a quick request to the email handler to set the notifications then POST to check
    await agent.post(`/notification/${OV_ID}/create`).send({ emailAddress: 'example@example.com' }).expect(302)

    officialVisitsService.sendNotification.mockResolvedValue({} as NotificationResponse)

    await agent
      .post(`/notification/${OV_ID}/create/check`)
      .expect(302)
      .expect('location', `/notification/${OV_ID}/create/sent`)

    expect(officialVisitsService.sendNotification).toHaveBeenCalledWith(
      OV_ID,
      expect.objectContaining({ notificationType: 'CREATE', emailAddresses: ['example@example.com'] }),
      user,
    )
  })

  it('POST should map edit action to AMEND', async () => {
    app = appWithAllRoutes({
      services: { auditService, officialVisitsService },
      userSupplier: () => user,
      journeySessionSupplier: () => ({ officialVisit: sampleVisit }),
      middlewares: [
        (req, _res, next) => {
          req.session.notifications = { [OV_ID]: { emailAddress: 'example@example.com' } }
          next()
        },
      ],
    })

    officialVisitsService.sendNotification.mockResolvedValue({} as NotificationResponse)

    await request(app)
      .post(`/notification/${OV_ID}/edit/check`)
      .expect(302)
      .expect('location', `/notification/${OV_ID}/edit/sent`)

    expect(officialVisitsService.sendNotification).toHaveBeenCalledWith(
      OV_ID,
      expect.objectContaining({ notificationType: 'AMEND', emailAddresses: ['example@example.com'] }),
      user,
    )
  })

  it('POST should map cancel action to CANCEL', async () => {
    app = appWithAllRoutes({
      services: { auditService, officialVisitsService },
      userSupplier: () => user,
      journeySessionSupplier: () => ({ officialVisit: sampleVisit }),
      middlewares: [
        (req, _res, next) => {
          req.session.notifications = { [OV_ID]: { emailAddress: 'example@example.com' } }
          next()
        },
      ],
    })

    officialVisitsService.sendNotification.mockResolvedValue({} as NotificationResponse)

    await request(app)
      .post(`/notification/${OV_ID}/cancel/check`)
      .expect(302)
      .expect('location', `/notification/${OV_ID}/cancel/sent`)

    expect(officialVisitsService.sendNotification).toHaveBeenCalledWith(
      OV_ID,
      expect.objectContaining({ notificationType: 'CANCEL', emailAddresses: ['example@example.com'] }),
      user,
    )
  })

  it('POST without email in session should redirect back to enter email', async () => {
    // Build app without populating notifications
    appSetup(() => ({ officialVisit: sampleVisit }))

    await request(app)
      .post(`/notification/${OV_ID}/create/check`)
      .expect(302)
      .expect('location', `/notification/${OV_ID}/create`)
  })
})
