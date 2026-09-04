import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import AuditService from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { VisitForReview, VisitForReviewIssueType } from '../../../../@types/officialVisitsApi/types'
import { getByDataQa, getGovukTableCell, getPageHeader } from '../../../testutils/cheerio'
import { AuthorisedRoles } from '../../../../middleware/populateUserPermissions'
import { Permission } from '../../../../interfaces/hmppsUser'
import config from '../../../../config'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/officialVisitsService')
jest.mock('../../../../services/telemetryService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const URL = '/review/list'

const viewOnlyUser = {
  ...user,
  userRoles: [AuthorisedRoles.VIEW],
  permissions: { OV: Permission.DEFAULT | Permission.VIEW },
}

const review = ({
  officialVisitId,
  lastName = 'Smith',
  firstName = 'John',
  prisonerNumber = 'A1337AA',
  visitDate = '2026-01-10',
  issueTypes,
}: {
  officialVisitId: number
  lastName?: string
  firstName?: string
  prisonerNumber?: string
  visitDate?: string
  issueTypes: VisitForReviewIssueType[]
}) =>
  ({
    visit: {
      officialVisitId,
      prisonCode: 'HEI',
      visitStatus: 'SCHEDULED',
      visitTypeCode: 'IN_PERSON',
      visitTypeDescription: 'In person',
      visitDate,
      startTime: '09:00',
      endTime: '09:30',
      dpsLocationId: 'loc-1',
      createdBy: 'user1',
      createdTime: '2026-01-01T09:00:00',
      prisonerVisited: { prisonerNumber, prisonCode: 'HEI', firstName, lastName },
    },
    issues: issueTypes.map((issueType, index) => ({
      visitReviewDetailId: officialVisitId * 10 + index,
      issueType,
      raisedTime: '2026-01-02T09:00:00',
    })),
  }) as VisitForReview

const reviewPage = (content: VisitForReview[], totalElements = content.length, totalPages = 1) => ({
  content,
  page: { number: 0, size: 10, totalElements, totalPages },
})

const appSetup = (userSupplier = () => user) => {
  app = appWithAllRoutes({ services: { auditService, officialVisitsService }, userSupplier })
}

const enabledPrisons = config.featureToggles.visitsNeedReviewPrisons

beforeEach(() => {
  config.featureToggles.visitsNeedReviewPrisons = 'HEI'
  appSetup()
})

afterEach(() => {
  config.featureToggles.visitsNeedReviewPrisons = enabledPrisons
  jest.resetAllMocks()
})

describe('GET /review/list', () => {
  it('should render the heading, the checks reveal and the empty state when nothing needs review', async () => {
    officialVisitsService.getVisitsForReview.mockResolvedValue(reviewPage([]))

    const response = await request(app).get(URL).expect(200)
    const $ = cheerio.load(response.text)

    expect(getPageHeader($)).toBe('Official visits that need review')
    expect(getByDataQa($, 'which-checks-details').text()).toContain('Bookings are added to this list when a:')
    expect(getByDataQa($, 'which-checks-details').text()).toContain('visitor is a social visitor')
    expect(getByDataQa($, 'no-results').text()).toBe('There are no official visits that need review.')
    expect(getByDataQa($, 'results-summary')).toHaveLength(0)
    expect($('table')).toHaveLength(0)
  })

  it('should show a summary of the results and a row per visit', async () => {
    officialVisitsService.getVisitsForReview.mockResolvedValue(
      reviewPage([
        review({ officialVisitId: 1, issueTypes: ['VISITOR_NOT_OFFICIAL'] }),
        review({
          officialVisitId: 2,
          lastName: 'Doe',
          firstName: 'Jane',
          prisonerNumber: 'A1111AA',
          issueTypes: ['VISITOR_NO_RELATIONSHIP', 'VISITOR_NOT_OFFICIAL', 'VISITOR_NOT_APPROVED'],
        }),
      ]),
    )

    const response = await request(app).get(URL).expect(200)
    const $ = cheerio.load(response.text)

    expect(getByDataQa($, 'results-summary').text().replace(/\s+/g, ' ').trim()).toBe(
      'You have 2 visits to review (page 1 of 1).',
    )
    expect(getGovukTableCell($, 1, 1).text()).toContain('Smith, John')
    expect(getGovukTableCell($, 1, 1).text()).toContain('A1337AA')
    expect(getGovukTableCell($, 1, 2).text()).toContain('09:00 to 09:30')
    expect(getGovukTableCell($, 1, 3).text()).toContain('Social visitor')

    const secondRowReasons = getGovukTableCell($, 2, 3).text()
    expect(secondRowReasons).toContain('Contact not approved')
    expect(secondRowReasons).toContain('Unauthorised visitor')
    expect(secondRowReasons).toContain('Social visitor')
  })

  it('should use the singular when a single visit needs review', async () => {
    officialVisitsService.getVisitsForReview.mockResolvedValue(
      reviewPage([review({ officialVisitId: 1, issueTypes: ['PRISONER_RELEASED'] })]),
    )

    const response = await request(app).get(URL).expect(200)
    const $ = cheerio.load(response.text)

    expect(getByDataQa($, 'results-summary').text().replace(/\s+/g, ' ').trim()).toBe(
      'You have 1 visit to review (page 1 of 1).',
    )
  })

  it('should ask the API for the requested page and render its totals', async () => {
    officialVisitsService.getVisitsForReview.mockResolvedValue(
      reviewPage([review({ officialVisitId: 1, issueTypes: ['PRISONER_RELEASED'] })], 15, 2),
    )

    const response = await request(app).get(`${URL}?page=2`).expect(200)
    const $ = cheerio.load(response.text)

    expect(officialVisitsService.getVisitsForReview).toHaveBeenCalledWith('HEI', 1, 10, expect.anything())
    expect(getByDataQa($, 'results-summary').text().replace(/\s+/g, ' ').trim()).toBe(
      'You have 15 visits to review (page 2 of 2).',
    )
  })

  it('should show a Cancel visit action only when the prisoner was released or transferred', async () => {
    officialVisitsService.getVisitsForReview.mockResolvedValue(
      reviewPage([
        review({ officialVisitId: 1, visitDate: '2026-01-10', issueTypes: ['PRISONER_RELEASED'] }),
        review({ officialVisitId: 2, visitDate: '2026-01-11', issueTypes: ['VISITOR_NOT_OFFICIAL'] }),
      ]),
    )

    const response = await request(app).get(URL).expect(200)
    const $ = cheerio.load(response.text)

    expect(getGovukTableCell($, 1, 4).text()).toContain('Cancel visit')
    expect(getGovukTableCell($, 1, 4).find('a[href^="/view/visit/1/cancel"]')).toHaveLength(1)
    expect(getGovukTableCell($, 2, 4).text()).not.toContain('Cancel visit')
  })

  it('should address the prisoner profile, acknowledge and cancel links from the row', async () => {
    officialVisitsService.getVisitsForReview.mockResolvedValue(
      reviewPage([review({ officialVisitId: 77, prisonerNumber: 'A1337AA', issueTypes: ['PRISONER_RELEASED'] })]),
    )

    const response = await request(app).get(`${URL}?page=2`).expect(200)
    const $ = cheerio.load(response.text)

    expect(getGovukTableCell($, 1, 1).find('a').attr('href')).toBe('http://localhost:3001/prisoner/A1337AA')
    expect(getGovukTableCell($, 1, 4).find('form').attr('action')).toBe('/review/list/77/acknowledge')

    const cancelHref = getGovukTableCell($, 1, 4).find('a[href*="/cancel"]').attr('href')
    const params = new URLSearchParams(cancelHref.split('?')[1])
    expect(atob(params.get('from'))).toBe(`${URL}?page=2`)
    expect(atob(params.get('backTo'))).toBe(`${URL}?page=2`)
  })

  it('should not show mutating actions to a view only user', async () => {
    appSetup(() => viewOnlyUser)
    officialVisitsService.getVisitsForReview.mockResolvedValue(
      reviewPage([review({ officialVisitId: 1, issueTypes: ['PRISONER_RELEASED'] })]),
    )

    const response = await request(app).get(URL).expect(200)
    const $ = cheerio.load(response.text)

    const actions = getGovukTableCell($, 1, 4).text()
    expect(actions).toContain('View')
    expect(actions).not.toContain('Cancel visit')
    expect(actions).not.toContain('Acknowledge')
  })

  it('should redirect home when the prison is not enabled for visits needing review', async () => {
    config.featureToggles.visitsNeedReviewPrisons = 'MDI'
    appSetup()

    await request(app).get(URL).expect(302).expect('Location', '/')

    expect(officialVisitsService.getVisitsForReview).not.toHaveBeenCalled()
  })

  it('should not be available to a user without any official visits role', async () => {
    appSetup(() => ({ ...user, userRoles: [], permissions: { OV: 0 as Permission } }))

    const response = await request(app).get(URL).expect(200)

    expect(response.text).toContain('You do not have permission')
    expect(officialVisitsService.getVisitsForReview).not.toHaveBeenCalled()
  })
})

describe('POST /review/list/:officialVisitId/acknowledge', () => {
  it('should acknowledge the review and return to the list', async () => {
    officialVisitsService.acknowledgeVisitReview.mockResolvedValue(undefined)

    await request(app)
      .post(`${URL}/42/acknowledge`)
      .send({ returnTo: '/review/list?page=2' })
      .expect(302)
      .expect('location', '/review/list?page=2')

    expect(officialVisitsService.acknowledgeVisitReview).toHaveBeenCalledWith('HEI', 42, expect.anything())
  })

  it('should not be available to a view only user', async () => {
    appSetup(() => viewOnlyUser)

    await request(app).post(`${URL}/42/acknowledge`).send({}).expect(200)

    expect(officialVisitsService.acknowledgeVisitReview).not.toHaveBeenCalled()
  })
})
