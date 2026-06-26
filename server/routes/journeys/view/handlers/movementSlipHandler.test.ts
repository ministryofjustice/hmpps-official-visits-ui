import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'

import OfficialVisitsService from '../../../../services/officialVisitsService'
import AuditService from '../../../../services/auditService'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockVisitByIdVisit } from '../../../../testutils/mocks'
import { getPageHeader, getValueByKey } from '../../../testutils/cheerio'
import config from '../../../../config'

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
  config.featureToggles.bulkMovementSlipsPrisons = ''
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

          expect(getValueByKey($, 'Time')).toEqual('10:00 to 11:00Friday, 25 December 2099')

          expect(getValueByKey($, 'Location')).toEqual('First Location')
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

    it('should render the new layout when the prison is enabled', () => {
      config.featureToggles.bulkMovementSlipsPrisons = 'HEI'

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('h1').text().replace(/\s+/g, ' ').trim()).toContain(
            `Moorland (HMP & YOI) Movement authorisation slip`,
          )

          expect(getValueByKey($, 'Prisoner')).toEqual('Tim Harrison, G4793VF')
          expect(getValueByKey($, 'Time and date')).toEqual('10:00 to 11:00, Friday, 25 December 2099')
          expect(getValueByKey($, 'Visit type')).toEqual('Video')
          expect(getValueByKey($, 'Location')).toEqual('First Location')

          expect($('.movement-slip').length).toBe(1)
          expect($('#print-button').text().trim()).toBe('Print movement slip')
        })
    })
  })
})
