import type { Express, Response } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'

import OfficialVisitsService from '../../../../services/officialVisitsService'
import AuditService from '../../../../services/auditService'
import config from '../../../../config'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockFindByCriteriaVisit, mockTimeslots } from '../../../../testutils/mocks'
import { FindByCriteriaResults, ReferenceDataItem } from '../../../../@types/officialVisitsApi/types'
import { getPageHeader } from '../../../testutils/cheerio'

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
  config.featureToggles.bulkMovementSlipsPrisons = 'HEI'
  officialVisitsService.getVisits.mockResolvedValue({
    content: [mockFindByCriteriaVisit, { ...mockFindByCriteriaVisit, officialVisitId: 2 }],
    page: { totalElements: 2, totalPages: 1, number: 0, size: 1000 },
  } as FindByCriteriaResults)
  officialVisitsService.getAvailableSlots.mockResolvedValue(mockTimeslots)
  officialVisitsService.getReferenceData.mockImplementation((_: Response, code: string) => {
    if (code === 'VIS_TYPE') {
      return Promise.resolve([
        { code: 'TYPE1', description: 'Type1' },
        { code: 'TYPE2', description: 'Type2' },
      ] as ReferenceDataItem[])
    }
    if (code === 'VIS_STATUS') {
      return Promise.resolve([
        { code: 'STATUS1', description: 'Status1' },
        { code: 'STATUS2', description: 'Status2' },
      ] as ReferenceDataItem[])
    }
    return Promise.resolve([])
  })
})

afterEach(() => {
  jest.resetAllMocks()
  config.featureToggles.bulkMovementSlipsPrisons = ''
})

const URL = `/view/movement-slips`

describe('Movement slips', () => {
  describe('GET', () => {
    it('should render movement slips for all matching visits', () => {
      return request(app)
        .get(`${URL}?startDate=2025-03-01&endDate=2027-03-25`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect(getPageHeader($)).toContain('Movement authorisation slip')

          const slips = $('.dotted-border')
          expect(slips.length).toBe(2)

          expect(officialVisitsService.getVisits).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ startDate: '2025-03-01', endDate: '2027-03-25' }),
            0,
            1000,
            expect.any(Object),
          )
          expect(officialVisitsService.getOfficialVisitById).not.toHaveBeenCalled()
        })
    })

    it('should show empty message when no visits found', () => {
      officialVisitsService.getVisits.mockResolvedValue({
        content: [],
        page: { totalElements: 0, totalPages: 0, number: 0, size: 1000 },
      } as FindByCriteriaResults)

      return request(app)
        .get(`${URL}?startDate=2025-03-01&endDate=2027-03-25`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('.dotted-border').length).toBe(0)
          expect($('.govuk-body').text()).toContain('No visits found')
        })
    })

    it('should redirect to the visit list when the prison is not enabled', () => {
      config.featureToggles.bulkMovementSlipsPrisons = ''

      return request(app)
        .get(`${URL}?startDate=2025-03-01&endDate=2027-03-25`)
        .expect(302)
        .expect('Location', '/view/list')
        .expect(() => {
          expect(officialVisitsService.getVisits).not.toHaveBeenCalled()
        })
    })

    it('should render print button', () => {
      return request(app)
        .get(`${URL}?startDate=2025-03-01&endDate=2027-03-25`)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const printBtn = $('#print-button')
          expect(printBtn.length).toBe(1)
          expect(printBtn.text().trim()).toBe('Print movement slips')
        })
    })
  })
})
