import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, flashProvider, user } from '../../../testutils/appSetup'
import AuditService, { Page } from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { PagedModelSentEmailRecord } from '../../../../@types/officialVisitsApi/types'
import { getGovukTableCell, getPageHeader } from '../../../testutils/cheerio'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/officialVisitsService')
jest.mock('../../../../services/telemetryService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const appSetup = () => {
  app = appWithAllRoutes({
    services: { auditService, officialVisitsService },
    userSupplier: () => ({
      ...user,
      activeCaseLoad: {
        description: 'HMP Example (HMI)',
      },
    }),
  })
}

beforeEach(() => {
  appSetup()
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = '/view/sent-emails'

const RESULTS: PagedModelSentEmailRecord = {
  content: [
    {
      officialVisitId: 4006,
      sentDate: '2026-05-20',
      sentDateTime: '2026-05-10T12:23:00',
      visitDate: '2026-05-21',
      visitStartTime: '13:30',
      visitEndTime: '16:00',
      prisonerName: 'Harrison, Tim',
      prisonerNumber: 'G4793VF',
      emailAddress: 'prabash.balasuriya@justice.gov.uk',
      emailStatus: 'SENT',
      notificationType: 'CREATE',
      notificationTypeDescription: 'Create',
    },
    {
      officialVisitId: 4005,
      sentDate: '2026-05-19',
      sentDateTime: '2026-05-10T12:23:00',
      visitDate: '2026-05-20',
      visitStartTime: '13:30',
      visitEndTime: '16:00',
      prisonerName: 'Doe, Jane',
      prisonerNumber: 'A1234AA',
      emailAddress: 'jane.doe@example.com',
      emailStatus: 'FAILED',
      notificationType: 'AMEND',
      notificationTypeDescription: 'Amend',
    },
    {
      officialVisitId: 4004,
      sentDate: '2026-05-18',
      sentDateTime: '2026-05-10T12:23:00',
      visitDate: '2026-05-19',
      visitStartTime: '13:30',
      visitEndTime: '16:00',
      prisonerName: 'Malicious, Peter',
      prisonerNumber: 'B2345BB',
      emailAddress: 'peter.malicious@example.com',
      emailStatus: 'SENT',
      notificationType: 'CANCEL',
      notificationTypeDescription: 'Cancel',
    },
  ],
  page: {
    number: 0,
    size: 10,
    totalElements: 11,
    totalPages: 2,
  },
}

const PAGE_2_RESULTS: PagedModelSentEmailRecord = {
  ...RESULTS,
  content: [RESULTS.content[0], RESULTS.content[1], RESULTS.content[2]],
  page: {
    number: 1,
    size: 10,
    totalElements: 7,
    totalPages: 3,
  },
}

describe('sent emails handler', () => {
  it('GET should render the sent emails page with every table value and pagination', async () => {
    officialVisitsService.getSentEmails.mockResolvedValue(RESULTS)

    const res = await request(app).get(URL).expect(200)
    const $ = cheerio.load(res.text)

    expect($('.govuk-hint').first().text().trim()).toEqual('View official visit email status')
    expect(getPageHeader($)).toEqual('Official visit emails sent from HMP Example (HMI)')
    expect($('.govuk-body').first().text()).toContain('View the status of emails that have been sent to visitors')
    expect($('.search-form .govuk-heading-s').text().trim()).toEqual('Search by date range')
    expect($('#fromDate').attr('value')).toBeUndefined()
    expect($('#toDate').attr('value')).toBeUndefined()
    expect($('.moj-pagination__results').first().text()).toContain('Showing 1 to 10 of 11 total results')

    const headers = $('.govuk-table__header')
    expect(headers.eq(0).text().trim()).toEqual('Visit date and time')
    expect(headers.eq(1).text().trim()).toEqual('Prisoner')
    expect(headers.eq(2).text().trim()).toEqual('Email address')
    expect(headers.eq(3).text().trim()).toEqual('Email status')
    expect(headers.eq(4).text().trim()).toEqual('Email sent')

    expect(getGovukTableCell($, 1, 1).text()).toContain('13:30 to 16:00')
    expect(getGovukTableCell($, 1, 1).text()).toContain('21 May 2026')
    expect(getGovukTableCell($, 1, 2).text()).toContain('Harrison, Tim')
    expect(getGovukTableCell($, 1, 2).text()).toContain('G4793VF')
    expect(getGovukTableCell($, 1, 2).find('a').attr('href')).toEqual('/view/visit/4006')
    expect(getGovukTableCell($, 1, 3).text()).toEqual('prabash.balasuriya@justice.gov.uk')
    expect(getGovukTableCell($, 1, 4).find('.govuk-tag').text().trim()).toEqual('SENT')
    expect(getGovukTableCell($, 1, 4).find('.govuk-tag').hasClass('govuk-tag--green')).toEqual(true)
    expect(getGovukTableCell($, 2, 4).find('.govuk-tag').text().trim()).toEqual('FAILED')
    expect(getGovukTableCell($, 2, 4).find('.govuk-tag').hasClass('govuk-tag--red')).toEqual(true)
    expect(getGovukTableCell($, 1, 5).text()).toContain('12:23')
    expect(getGovukTableCell($, 1, 5).text()).toContain('10 May 2026')

    expect(officialVisitsService.getSentEmails).toHaveBeenCalledWith(
      user.activeCaseLoadId,
      {},
      1,
      10,
      expect.objectContaining(user),
    )
    expect(auditService.logPageView).toHaveBeenCalledWith(Page.VIEW_SENT_EMAILS_PAGE, {
      who: user.username,
      correlationId: expect.any(String),
    })
  })

  it('GET should preserve date range search values and paginate with query params', async () => {
    officialVisitsService.getSentEmails.mockResolvedValue(PAGE_2_RESULTS)

    const res = await request(app).get(`${URL}?page=2&fromDate=15/05/2026&toDate=20/05/2026`).expect(200)
    const $ = cheerio.load(res.text)

    expect($('#fromDate').attr('value')).toEqual('15/05/2026')
    expect($('#toDate').attr('value')).toEqual('20/05/2026')
    expect($('.govuk-pagination__prev a.govuk-pagination__link').attr('href')).toEqual(
      '?fromDate=15%2F05%2F2026&toDate=20%2F05%2F2026&page=1',
    )
    expect($('.govuk-pagination__next a.govuk-pagination__link').attr('href')).toEqual(
      '?fromDate=15%2F05%2F2026&toDate=20%2F05%2F2026&page=3',
    )

    expect(officialVisitsService.getSentEmails).toHaveBeenCalledWith(
      user.activeCaseLoadId,
      {
        fromDate: '2026-05-15',
        toDate: '2026-05-20',
      },
      2,
      10,
      expect.objectContaining(user),
    )
  })

  it('POST should validate search form and show date errors', async () => {
    await request(app)
      .post(URL)
      .set('Referrer', URL)
      .send({ fromDate: '32/05/2026', toDate: '20/13/2026' })
      .expect(302)
      .expect('location', URL)

    expectErrorMessages([
      {
        fieldId: 'fromDate',
        href: '#fromDate',
        text: 'From date must be a real date',
      },
      {
        fieldId: 'toDate',
        href: '#toDate',
        text: 'To date must be a real date',
      },
    ])
  })

  it('POST should redirect to GET with validated query params', async () => {
    await request(app)
      .post(URL)
      .send({ fromDate: '15/05/2026', toDate: '20/05/2026' })
      .expect(302)
      .expect('location', `${URL}?fromDate=15%2F05%2F2026&toDate=20%2F05%2F2026&page=1`)
  })

  it('GET should preserve invalid posted values in form fields after validation failure', async () => {
    const malformedFromDate = '31/02/2026'
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

    const agent = request.agent(app)
    await agent
      .post(URL)
      .set('Referrer', URL)
      .send({ fromDate: malformedFromDate, toDate: '' })
      .expect(302)
      .expect('location', URL)

    const res = await agent.get(URL).expect(200)
    const $ = cheerio.load(res.text)
    expect($('#fromDate').attr('value')).toEqual(malformedFromDate)
    expect(res.text).toContain('From date must be a real date')
  })
})
