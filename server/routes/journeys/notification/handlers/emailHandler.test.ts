import { Express, RequestHandler } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user, flashProvider } from '../../../testutils/appSetup'
import type { HmppsUser } from '../../../../interfaces/hmppsUser'
import { Permission } from '../../../../interfaces/hmppsUser'
import AuditService, { Page } from '../../../../services/auditService'
import { getPageHeader } from '../../../testutils/cheerio'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import config from '../../../../config'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { OfficialVisitNotifications } from '../../../../@types/officialVisitsApi/types'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/telemetryService')
jest.mock('../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const appSetup = (middlewares: RequestHandler[] = []) => {
  app = appWithAllRoutes({
    services: { auditService, officialVisitsService },
    userSupplier: () => user,
    journeySessionSupplier: () => ({}),
    middlewares,
  })
}

beforeEach(() => {
  config.featureToggles.emailNotificationsPrisons = 'HEI'
  appSetup()
  officialVisitsService.getNotificationsByOfficialVisitId.mockResolvedValue([{}] as OfficialVisitNotifications)
})

afterEach(() => {
  jest.resetAllMocks()
})

const OV_ID = '1'
const URL = `/notification/enter-email-address/${OV_ID}/create`

const emailInput = ($: cheerio.CheerioAPI, index: number) => $(`[id="emailAddresses[${index}]"]`)

const useStoringFlashProvider = () => {
  const flashStore: Record<string, string[]> = {}

  flashProvider.mockImplementation((name: string, value?: string) => {
    if (typeof value !== 'undefined') {
      flashStore[name] = flashStore[name] || []
      flashStore[name].push(value)
      return []
    }

    const values = flashStore[name] || []
    flashStore[name] = []
    return values
  })
}

describe('notification email handler', () => {
  describe('GET', () => {
    it('should render the not-authorised page if user does not have MANAGE permission', () => {
      const userWithoutPermission: HmppsUser = {
        ...user,
        userRoles: [],
        permissions: { OV: Permission.DEFAULT },
      }

      const appWithoutPermission = appWithAllRoutes({
        services: { auditService },
        userSupplier: () => userWithoutPermission,
        journeySessionSupplier: () => ({}),
      })

      return request(appWithoutPermission)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(200)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect(getPageHeader($)).toEqual('You do not have permission to access this page')
          expect(res.text).toContain('have the correct permissions to use the official visits service')
          expect(auditService.logPageView).not.toHaveBeenCalled()
        })
    })

    it('should render a single empty add another item when no session email present', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect(getPageHeader($)).toEqual('Enter an email address')
          expect($('.moj-add-another__item')).toHaveLength(1)
          expect(emailInput($, 0).attr('value')).toEqual('')
          expect($('.govuk-button').text()).toContain('Continue')
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.NOTIFICATION_ENTER_EMAIL_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should render the add another component so the client script can clone items', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('[data-module="moj-add-another"]')).toHaveLength(1)
          expect($('.moj-add-another__add-button').text()).toContain('Add another email address')
          expect(emailInput($, 0).attr('data-name')).toEqual('emailAddresses[%index%]')
          expect(emailInput($, 0).attr('data-id')).toEqual('emailAddresses[%index%]')
          expect(emailInput($, 0).attr('data-label')).toEqual('Enter an email address')
        })
    })

    it('should show visit details text for create action', () => {
      return request(app)
        .get(`/notification/enter-email-address/${OV_ID}/create`)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('An email will be sent confirming the details of this official visit.')
          expect(res.text).not.toContain('the cancellation of this official visit')
        })
    })

    it('should show visit details text for edit action', () => {
      return request(app)
        .get(`/notification/enter-email-address/${OV_ID}/edit`)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('An email will be sent confirming the details of this official visit.')
          expect(res.text).not.toContain('the cancellation of this official visit')
        })
    })

    it('should show cancellation text for cancel action', () => {
      return request(app)
        .get(`/notification/enter-email-address/${OV_ID}/cancel`)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('An email will be sent confirming the cancellation of this official visit.')
          expect(res.text).not.toContain('the details of this official visit')
        })
    })

    it('should populate an item per address when the session contains emails', () => {
      const mw: RequestHandler = (req, _res, next) => {
        const session = req.session as unknown as { notifications?: Record<string, { emailAddresses?: string[] }> }
        session.notifications = session.notifications || {}
        session.notifications[OV_ID] = { emailAddresses: ['example@example.com', 'second@example.com'] }
        next()
      }

      appSetup([mw])

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.moj-add-another__item')).toHaveLength(2)
          expect(emailInput($, 0).attr('value')).toEqual('example@example.com')
          expect(emailInput($, 1).attr('value')).toEqual('second@example.com')
          expect(emailInput($, 1).attr('name')).toEqual('emailAddresses[1]')
        })
    })

    it('should pre populate with previous emails when there are previous notifications', () => {
      officialVisitsService.getNotificationsByOfficialVisitId.mockResolvedValue([
        { emailAddress: 'test@example.com' },
        { emailAddress: 'other@example.com' },
      ] as OfficialVisitNotifications)

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect(res.text).toContain('An email will be sent confirming the details of this official visit.')
          expect(emailInput($, 0).attr('value')).toEqual('test@example.com')
          expect(emailInput($, 1).attr('value')).toEqual('other@example.com')
        })
    })

    it('should not repeat an address that appears in several previous notifications', () => {
      officialVisitsService.getNotificationsByOfficialVisitId.mockResolvedValue([
        { emailAddress: 'test@example.com' },
        { emailAddress: 'test@example.com' },
      ] as OfficialVisitNotifications)

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.moj-add-another__item')).toHaveLength(1)
          expect(emailInput($, 0).attr('value')).toEqual('test@example.com')
        })
    })
  })

  describe('POST', () => {
    it('should validate and show an error against the first item for an empty email', () => {
      return request(app)
        .post(URL)
        .send({ emailAddresses: [''] })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'emailAddresses[0]',
              href: '#emailAddresses[0]',
              text: 'Enter an email address',
            },
          ]),
        )
    })

    it('should only ask for the first address when every item is left empty', () => {
      return request(app)
        .post(URL)
        .send({ emailAddresses: ['', '', ''] })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'emailAddresses[0]',
              href: '#emailAddresses[0]',
              text: 'Enter an email address',
            },
          ]),
        )
    })

    it('should report an error against each item that is invalid or left behind', () => {
      return request(app)
        .post(URL)
        .send({ emailAddresses: ['valid@example.com', '', 'not-an-email'] })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'emailAddresses[1]',
              href: '#emailAddresses[1]',
              text: 'Enter an email address',
            },
            {
              fieldId: 'emailAddresses[2]',
              href: '#emailAddresses[2]',
              text: 'Enter an email address in the correct format',
            },
          ]),
        )
    })

    it('should reject a malformed email and prepopulate the field without modifying it', async () => {
      const malformedEmail = 'prabash.balasuriya@justice.gov.uk45E£'
      useStoringFlashProvider()

      const agent = request.agent(app)

      await agent
        .post(URL)
        .set('Referrer', URL)
        .send({ emailAddresses: [malformedEmail] })
        .expect(302)
        .expect('location', URL)

      await agent
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect(getPageHeader($)).toEqual('Enter an email address')
          expect(res.text).toContain('Enter an email address in the correct format')
          expect(emailInput($, 0).attr('value')).toEqual(malformedEmail)
        })
    })

    it('should keep every item, including the empty ones, when validation fails', async () => {
      useStoringFlashProvider()

      const agent = request.agent(app)

      await agent
        .post(URL)
        .set('Referrer', URL)
        .send({ emailAddresses: ['first@example.com', '', 'third@example.com'] })
        .expect(302)

      await agent
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.moj-add-another__item')).toHaveLength(3)
          expect(emailInput($, 0).attr('value')).toEqual('first@example.com')
          expect(emailInput($, 1).attr('value')).toEqual('')
          expect(emailInput($, 2).attr('value')).toEqual('third@example.com')
        })
    })

    it('should accept the bracketed form encoding a browser actually submits', async () => {
      const agent = request.agent(app)

      await agent
        .post(URL)
        .type('form')
        .send('emailAddresses[0]=first%40example.com&emailAddresses[1]=second%40example.com')
        .expect(302)
        .expect('location', '/notification/add-video-link/1/create')

      await agent
        .get('/notification/add-video-link/1/create')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect(getPageHeader($)).toEqual('Add video link')
        })
    })

    it('should accept valid emails and persist them to session then redirect to add video link', async () => {
      const agent = request.agent(app)

      await agent
        .post(URL)
        .send({ emailAddresses: ['example@example.com', 'another@example.com'] })
        .expect(302)
        .expect('location', '/notification/add-video-link/1/create')

      // Follow redirect with same agent to ensure session cookie is preserved
      await agent
        .get('/notification/add-video-link/1/create')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect(getPageHeader($)).toEqual('Add video link')
        })

      await agent
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect(emailInput($, 0).attr('value')).toEqual('example@example.com')
          expect(emailInput($, 1).attr('value')).toEqual('another@example.com')
        })
    })

    it('should discard a duplicated address before storing it', async () => {
      const agent = request.agent(app)

      await agent
        .post(URL)
        .send({ emailAddresses: ['example@example.com', 'example@example.com'] })
        .expect(302)

      await agent
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('.moj-add-another__item')).toHaveLength(1)
          expect(emailInput($, 0).attr('value')).toEqual('example@example.com')
        })
    })
  })
})
