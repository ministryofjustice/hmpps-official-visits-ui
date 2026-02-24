import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'

import OfficialVisitsService from '../../../../services/officialVisitsService'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockVisitByIdVisit } from '../../../../testutils/mocks'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'

jest.mock('../../../../services/officialVisitsService')

const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const appSetup = () => {
  app = appWithAllRoutes({
    services: { officialVisitsService },
    userSupplier: () => user,
  })
}

beforeEach(() => {
  appSetup()

  officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)

  officialVisitsService.getReferenceData.mockImplementation(async (_res: unknown, type: string) => {
    if (type === 'VIS_COMPLETION') {
      return [
        { code: 'COMPLETE', description: 'Completed' },
        { code: 'NO_SHOW', description: 'No show' },
        { code: 'SOMETHING_CANCELLED', description: 'Should be filtered out' },
      ]
    }
    if (type === 'SEARCH_LEVEL') {
      return [
        { code: 'FULL', description: 'Full' },
        { code: 'RUB_DOWN', description: 'Rub down' },
      ]
    }
    return []
  })

  officialVisitsService.completeVisit.mockResolvedValue(undefined)
})

afterEach(() => {
  jest.resetAllMocks()
})

const ovId = 1
const URL = `/view/visit/${ovId}/complete`

describe('CompleteOfficialVisitHandler', () => {
  describe('GET', () => {
    it('should render the complete page and filter out *_CANCELLED completion codes', async () => {
      await request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').eq(0).text().trim()).toBe('Complete an official visit')
          expect($('.govuk-hint').eq(1).text().trim()).toBe(
            'Add any additional information related to the completion of this visit.',
          )
          expect($('h1.govuk-heading-l').text().trim()).toBe('Provide the visit outcome and attendance details')

          expect($('label[for="reason"]').text().replace(/\s+/g, ' ').trim()).toBe(
            'Select a completion reason from the list',
          )

          const optionValues = $('select[name="reason"] option')
            .map((_, el) => $(el).attr('value'))
            .get()
            .filter(v => v !== undefined) as string[]

          expect(optionValues).toContain('')

          expect(optionValues).toContain('COMPLETE')
          expect(optionValues).toContain('NO_SHOW')

          // Does not include cancelled codes
          expect(optionValues).not.toContain('SOMETHING_CANCELLED')

          expect($('#prisoner').attr('value')).toBe('G4793VF')

          expect($('.govuk-checkboxes__label[for="prisoner"]').text().trim()).toBe('Tim Harrison (Prisoner)')
          expect($('#prisoner').attr('checked')).toBe('checked')

          const searchTypeOptionValues = $('select[name="searchType"] option')
            .map((_, el) => $(el).attr('value'))
            .get()
            .filter(Boolean) as string[]
          expect(searchTypeOptionValues).toContain('FULL')
          expect(searchTypeOptionValues).toContain('RUB_DOWN')

          expect($('.govuk-checkboxes__label[for="attendance\\[0\\]"]').text().trim()).toBe(
            'Peter Malicious (Solicitor)',
          )
          expect($('#attendance\\[0\\]').attr('checked')).toBe('checked')

          const cancelLink = $('a.govuk-link.govuk-link--no-visited-state')
          expect(cancelLink.text().trim()).toBe('Cancel and return to visit summary')
          expect(cancelLink.attr('href')).toBe(`/view/visit/${ovId}`)

          expect(officialVisitsService.getOfficialVisitById).toHaveBeenCalledWith('HEI', ovId, user)
          expect(officialVisitsService.getReferenceData).toHaveBeenCalledWith(expect.anything(), 'VIS_COMPLETION')
          expect(officialVisitsService.getReferenceData).toHaveBeenCalledWith(expect.anything(), 'SEARCH_LEVEL')
        })
    })

    it('should append backTo param onto the cancel link when provided', async () => {
      const b64 = encodeURIComponent(btoa('/view/list?page=1&startDate=2026-01-28&endDate=2026-03-29'))

      await request(app)
        .get(`${URL}?backTo=${b64}`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          const cancelLink = $('a.govuk-link.govuk-link--no-visited-state')
          expect(cancelLink.attr('href')).toBe(`/view/visit/${ovId}?backTo=${b64}`)
        })
    })
  })

  describe('POST', () => {
    it('should error when no data are provided', async () => {
      await request(app)
        .post(`${URL}`)
        .type('form')
        .send({})
        .expect(302)
        .expect(() =>
          expectErrorMessages([
            { fieldId: 'reason', href: '#reason', text: 'Select a completion reason' },
            { fieldId: 'searchType', href: '#searchType', text: 'Select a search type' },
          ]),
        )
    })

    it('should error when reason is not provided', async () => {
      await request(app)
        .post(`${URL}`)
        .type('form')
        .send({
          prisoner: mockVisitByIdVisit.prisonerVisited.prisonerNumber,
          attendance: [mockVisitByIdVisit.officialVisitors[0].officialVisitorId],
          searchType: 'RUB_DOWN',
        })
        .expect(302)
        .expect(() => expectErrorMessages([{ fieldId: 'reason', href: '#reason', text: 'Select a completion reason' }]))
    })

    it('should error when searchType is not provided', async () => {
      await request(app)
        .post(`${URL}`)
        .type('form')
        .send({
          reason: 'COMPLETE',
          prisoner: mockVisitByIdVisit.prisonerVisited.prisonerNumber,
          attendance: [],
        })
        .expect(302)
        .expect(() =>
          expectErrorMessages([{ fieldId: 'searchType', href: '#searchType', text: 'Select a search type' }]),
        )
    })
    it('should call completeVisit with the expected body and redirect back to the visit summary', async () => {
      const b64 = encodeURIComponent(btoa('/view/list?page=1&startDate=2026-01-28&endDate=2026-03-29'))
      await request(app)
        .post(`${URL}?backTo=${b64}`)
        .type('form')
        .send({
          reason: 'COMPLETE',
          prisoner: mockVisitByIdVisit.prisonerVisited.prisonerNumber,
          attendance: [mockVisitByIdVisit.officialVisitors[0].officialVisitorId],
          searchType: 'RUB_DOWN',
        })
        .expect(302)
        .expect('Location', `/view/visit/${ovId}?backTo=${b64}`)

      expect(officialVisitsService.getOfficialVisitById).toHaveBeenCalledWith('HEI', ovId, user)

      expect(officialVisitsService.completeVisit).toHaveBeenCalledWith(
        'HEI',
        String(ovId),
        {
          completionReason: 'COMPLETE',
          prisonerAttendance: 'ATTENDED',
          visitorAttendance: [{ officialVisitorId: 1, visitorAttendance: 'ATTENDED' }],
          prisonerSearchType: 'RUB_DOWN',
        },
        user,
      )
    })

    // New test: prisoner not provided -> prisonerAttendance should be ABSENT
    it('should mark prisoner as ABSENT when prisoner not provided', async () => {
      const b64 = btoa('/view/list?page=1')
      const encodedB64 = encodeURIComponent(b64)

      await request(app)
        .post(`${URL}?backTo=${encodedB64}`)
        .type('form')
        .send({
          reason: 'NO_SHOW',
          attendance: [mockVisitByIdVisit.officialVisitors[0].officialVisitorId],
          searchType: 'RUB_DOWN',
        })
        .expect(302)
        // Express decodes percent-encoded query parameters, so the handler will redirect using the decoded value
        .expect('Location', `/view/visit/${ovId}?backTo=${b64}`)

      expect(officialVisitsService.completeVisit).toHaveBeenCalledWith(
        'HEI',
        String(ovId),
        {
          completionReason: 'NO_SHOW',
          prisonerAttendance: 'ABSENT',
          visitorAttendance: [
            {
              officialVisitorId: mockVisitByIdVisit.officialVisitors[0].officialVisitorId,
              visitorAttendance: 'ATTENDED',
            },
          ],
          prisonerSearchType: 'RUB_DOWN',
        },
        user,
      )
    })

    // New test: visitor not included in attendance -> visitorAttendance should be ABSENT
    it('should mark visitor as ABSENT when not checked in attendance', async () => {
      await request(app)
        .post(URL)
        .type('form')
        .send({
          reason: 'COMPLETE',
          prisoner: mockVisitByIdVisit.prisonerVisited.prisonerNumber,
          attendance: [],
          searchType: 'FULL',
        })
        .expect(302)
        .expect('Location', `/view/visit/${ovId}`)

      expect(officialVisitsService.completeVisit).toHaveBeenCalledWith(
        'HEI',
        String(ovId),
        {
          completionReason: 'COMPLETE',
          prisonerAttendance: 'ATTENDED',
          visitorAttendance: [
            {
              officialVisitorId: mockVisitByIdVisit.officialVisitors[0].officialVisitorId,
              visitorAttendance: 'ABSENT',
            },
          ],
          prisonerSearchType: 'FULL',
        },
        user,
      )
    })

    it('should disallow POST if the notes is larger than 240 characters', async () => {
      await request(app)
        .post(URL)
        .type('form')
        .send({
          reason: 'COMPLETE',
          prisoner: mockVisitByIdVisit.prisonerVisited.prisonerNumber,
          attendance: [mockVisitByIdVisit.officialVisitors[0].officialVisitorId],
          searchType: 'RUB_DOWN',
          comments: 'a'.repeat(241),
        })
        .expect(302)
        .expect('Location', `/`)

      expect(officialVisitsService.completeVisit).not.toHaveBeenCalled()
    })
  })
})
