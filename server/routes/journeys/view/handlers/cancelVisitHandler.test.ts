import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'

import OfficialVisitsService from '../../../../services/officialVisitsService'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockVisitByIdVisit } from '../../../../testutils/mocks'

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

  officialVisitsService.getReferenceData.mockImplementation(async () => {
    return [
      { code: 'COMPLETE', description: 'Completed' },
      { code: 'NO_SHOW', description: 'No show' },
      { code: 'SOMETHING_CANCELLED', description: 'Should be visible' },
    ]
  })

  officialVisitsService.completeVisit.mockResolvedValue(undefined)
  officialVisitsService.cancelVisit.mockResolvedValue(undefined)
})

afterEach(() => {
  jest.resetAllMocks()
})

const ovId = 1
const URL = `/view/visit/${ovId}/cancel`

describe('cancelVisitHandler', () => {
  describe('GET', () => {
    it('should render the cancel page and filter for *_CANCELLED completion codes', async () => {
      await request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').eq(0).text().trim()).toBe('Cancel an official visit')
          expect($('.govuk-hint').eq(1).text().trim()).toBe(
            'Add any additional information related to the cancellation of this visit.',
          )
          expect($('h1').text().trim()).toBe('Select cancellation reason for this visit')

          const optionValues = $('input[name="reason"]')
            .map((_, el) => $(el).attr('value'))
            .get()
            .filter(v => v !== undefined) as string[]

          expect(optionValues).not.toContain('COMPLETE')
          expect(optionValues).not.toContain('NO_SHOW')

          expect(optionValues).toContain('SOMETHING_CANCELLED')

          const cancelLink = $('a.govuk-link.govuk-link--no-visited-state')
          expect(cancelLink.text().trim()).toBe('Cancel and return to visit summary')
          expect(cancelLink.attr('href')).toBe(`/view/visit/${ovId}`)
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
    it('should call completeVisit with the expected body and redirect back to the visit summary', async () => {
      const b64 = encodeURIComponent(btoa('/view/list?page=1&startDate=2026-01-28&endDate=2026-03-29'))
      await request(app)
        .post(`${URL}?backTo=${b64}`)
        .type('form')
        .send({ reason: 'SOMETHING_CANCELLED', comments: 'some comments' })
        .expect(302)
        .expect('Location', `/view/visit/${ovId}?backTo=${b64}`)

      expect(officialVisitsService.cancelVisit).toHaveBeenCalledWith(
        'HEI',
        String(ovId),
        { cancellationReason: 'SOMETHING_CANCELLED', cancellationNotes: 'some comments' },
        user,
      )
    })

    it('should disallow POST if the notes is larger than 240 characters', async () => {
      await request(app)
        .post(URL)
        .type('form')
        .send({ reason: 'SOMETHING_CANCELLED', comments: 'a'.repeat(241) })
        .expect(302)
        .expect('Location', `/`)

      expect(officialVisitsService.cancelVisit).not.toHaveBeenCalled()
    })
  })
})
