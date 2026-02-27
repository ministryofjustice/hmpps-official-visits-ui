import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'

import OfficialVisitsService from '../../../../services/officialVisitsService'
import AuditService from '../../../../services/auditService'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockVisitByIdVisit } from '../../../../testutils/mocks'
import { getPageHeader, getValueByKey } from '../../../testutils/cheerio'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const appSetup = () => {
  app = appWithAllRoutes({
    services: { auditService, officialVisitsService },
    userSupplier: () => user,
  })
}

beforeEach(() => {
  appSetup()
  officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/view/visit/1/movement-slip`

describe('Official visit movement slip', () => {
  describe('GET', () => {
    it('should render the movement slip page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect(getPageHeader($)).toContain('Movement authorisation slip')

          expect($('h1').text().replace(/\s+/g, ' ').trim()).toContain(
            `Moorland (HMP & YOI) Movement authorisation slip`,
          )

          expect($('h2').text().replace(/\s+/g, ' ').trim()).toEqual(`Tim Harrison, G4793VF`)

          expect($('.govuk-hint').first().text().trim()).toEqual(`MDI-2-1-007`)

          expect(getValueByKey($, 'Official visit')).toEqual(null)
          expect(getValueByKey($, 'Visit type')).toEqual('Video')

          expect(getValueByKey($, 'Time')).toEqual('10:00am to 11:00amThursday, 1 January 2026')

          expect($('dt.govuk-summary-list__key').text()).toContain('Official Visitor')
          expect(getValueByKey($, 'Official Visitor')).toEqual('Peter Malicious (Solicitor)')
          const printBtn = $('#print-button')
          expect(printBtn.length).toBe(1)
          expect(printBtn.attr('href')).toBe('#')
          expect(printBtn.text().trim()).toBe('Print movement slip')

          const classAttr = printBtn.attr('class') || ''
          expect(classAttr).toContain('govuk-button')
          expect(classAttr).toContain('blue-button')
          expect(classAttr).toContain('govuk-!-display-none-print')
          expect(classAttr).toContain('govuk-!-display-none')

          const printedLine = $('p.govuk-hint.float-right').text().replace(/\s+/g, ' ').trim()
          expect(printedLine).toMatch(/Printed at (\d{2}):\d{2} on (.+?),/)
        })
    })
  })
})
