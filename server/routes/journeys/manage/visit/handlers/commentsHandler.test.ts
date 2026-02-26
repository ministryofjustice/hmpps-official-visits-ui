import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getPageHeader, getTextById } from '../../../../testutils/cheerio'
import { getJourneySession } from '../../../../testutils/testUtilRoute'
import { mockPrisoner } from '../../../../../testutils/mocks'
import { expectErrorMessages, expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express
const defaultJourneySession = () => ({
  officialVisit: {
    prisoner: mockPrisoner,
    prisonerNotes: 'Some previously entered notes',
    staffNotes: 'Some previously entered staff notes',
  } as Partial<OfficialVisitJourney>,
})

const appSetup = (journeySession = defaultJourneySession()) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
  appSetup()
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/comments`

describe('comments handler', () => {
  describe('GET (create)', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect($('.govuk-hint').eq(0).text()).toEqual('Schedule an official visit')
          expect(heading).toEqual('Add extra information (optional)')
          expect(getTextById($, 'prisonerNotes')).toEqual('Some previously entered notes')
          expect(getTextById($, 'staffNotes')).toEqual('Some previously entered staff notes')

          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to homepage')
          expect($('.govuk-link').last().attr('href')).toContain(`cancellation-check?stepsChecked=3`)

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.COMMENTS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('GET (amend)', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(`/manage/amend/1/${journeyId()}/comments`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect($('.govuk-hint').eq(0).text()).toEqual('Amend an official visit')
          expect(heading).toEqual('Add extra information (optional)')
          expect(getTextById($, 'prisonerNotes')).toEqual('Some previously entered notes')
          expect(getTextById($, 'staffNotes')).toEqual('Some previously entered staff notes')

          expect($('.govuk-button').text()).toContain('Submit')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to visit details')
          expect($('.govuk-link').last().attr('href')).toContain(`./`)

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.COMMENTS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should allow empty submissions', () => {
      return request(app)
        .post(URL)
        .send({})
        .expect(302)
        .expect('location', 'check-your-answers')
        .expect(() => expectNoErrorMessages())
    })

    it('should disallow prisonerNotes over 240 characters', () => {
      return request(app)
        .post(URL)
        .send({ prisonerNotes: 'a'.repeat(241) })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'prisonerNotes',
              href: '#prisonerNotes',
              text: 'Prisoner notes must be 240 characters or less',
            },
          ]),
        )
    })

    it('should disallow staffNotes over 240 characters', () => {
      return request(app)
        .post(URL)
        .send({ staffNotes: 'a'.repeat(241) })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'staffNotes',
              href: '#staffNotes',
              text: 'Staff notes must be 240 characters or less',
            },
          ]),
        )
    })

    it('should accept a form submission', async () => {
      await request(app)
        .post(URL)
        .send({ prisonerNotes: 'prisoner', staffNotes: 'staff' })
        .expect(302)
        .expect('location', 'check-your-answers')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.prisonerNotes).toEqual('prisoner')
      expect(journeySession.staffNotes).toEqual('staff')
    })

    it('should redirect to visit details page when in amend mode', async () => {
      await request(app)
        .post(`/manage/amend/1/${journeyId()}/comments`)
        .send({ prisonerNotes: 'prisoner', staffNotes: 'staff' })
        .expect(302)
        .expect('location', '/manage/amend/1/9211b69b-826f-4f48-a43f-8af59dddf39f')
    })
  })
})
