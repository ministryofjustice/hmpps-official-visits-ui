import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { getByDataQa, getPageHeader } from '../../../testutils/cheerio'
import AuditService, { Page } from '../../../../services/auditService'
import config from '../../../../config'
import { AuthorisedRoles } from '../../../../middleware/populateUserPermissions'
import BookAVideoLinkService from '../../../../services/bookAVideoLinkService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { mockMoorlandBvlsPrison } from '../../../../testutils/mocks'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/bookAVideoLinkService')
jest.mock('../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const bookAVideoLinkService = new BookAVideoLinkService(null) as jest.Mocked<BookAVideoLinkService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const createUserWithCaseLoad = ({
  activeCaseLoadId,
  activeCaseLoadDescription,
}: {
  activeCaseLoadId: string
  activeCaseLoadDescription: string
}) => ({
  ...user,
  activeCaseLoadId,
  activeCaseLoad: {
    description: activeCaseLoadDescription,
  },
})

beforeEach(() => {
  app = appWithAllRoutes({
    services: { auditService, bookAVideoLinkService },
    userSupplier: () =>
      createUserWithCaseLoad({
        activeCaseLoadId: 'MDI',
        activeCaseLoadDescription: 'Moorland (HMP & YOI)',
      }),
  })
  config.maintenanceMode = false
  config.featureToggles.nomisSwitchOffPrisons = ''
  config.featureToggles.emailNotificationsPrisons = ''
  config.featureToggles.visitsNeedReviewPrisons = 'MDI'
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /home', () => {
  it.each([
    [AuthorisedRoles.DEFAULT, ['view']],
    [AuthorisedRoles.VIEW, ['view']],
    [AuthorisedRoles.MANAGE, ['create', 'manage', 'sent-emails']],
    [AuthorisedRoles.ADMIN, ['schedule']],
  ])(`should render home page - %s (%s) view`, (role, visibleCards) => {
    auditService.logPageView.mockResolvedValue(null)
    config.featureToggles.emailNotificationsPrisons = 'MDI'
    app = appWithAllRoutes({
      services: { auditService },
      userSupplier: () => ({
        ...createUserWithCaseLoad({
          activeCaseLoadId: 'MDI',
          activeCaseLoadDescription: 'Moorland (HMP & YOI)',
        }),
        userRoles: [role],
      }),
    })
    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        const heading = getPageHeader($)
        expect(heading).toContain('Official visits')

        const bookVisitCard = getByDataQa($, 'book-official-visit-card')
        const manageVisitsCard = getByDataQa($, 'manage-official-visits-card')
        const viewVisitsCard = getByDataQa($, 'view-official-visits-card')
        const scheduleCard = getByDataQa($, 'official-visiting-schedule-card')
        const sentEmailsCard = getByDataQa($, 'view-sent-emails-card')

        // Check card contents individually
        if (visibleCards.includes('create')) {
          expect(bookVisitCard.find('.card__link').text()).toContain('Book an official visit')
        } else {
          expect(bookVisitCard.find('.card__link').text()).toBe('')
        }

        if (visibleCards.includes('manage')) {
          expect(manageVisitsCard.find('.card__link').text()).toContain('Manage official visits')
        } else {
          expect(manageVisitsCard.find('.card__link').text()).toBe('')
        }

        if (visibleCards.includes('view')) {
          expect(viewVisitsCard.find('.card__link').text()).toContain('View official visits')
        } else {
          expect(viewVisitsCard.find('.card__link').text()).toBe('')
        }

        if (visibleCards.includes('schedule')) {
          expect(scheduleCard.find('.card__link').text()).toContain('Official visiting schedule')
        } else {
          expect(scheduleCard.find('.card__link').text()).toBe('')
        }

        if (visibleCards.includes('sent-emails')) {
          expect(sentEmailsCard.find('.card__link').text()).toContain('View official visits emails')
        } else {
          expect(sentEmailsCard.find('.card__link').text()).toBe('')
        }

        expect(auditService.logPageView).toHaveBeenCalledWith(Page.HOME_PAGE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })

  it('should show NOMIS switch-off banner when prison is enabled in feature toggle', () => {
    config.featureToggles.nomisSwitchOffPrisons = 'MDI'
    bookAVideoLinkService.getPrisons.mockResolvedValue([])

    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        expect(res.text).toContain(
          'You must now use DPS to book and manage official visits. The Visits screens in NOMIS have now been switched off at your prison. You can',
        )
        const bannerLink = $(
          "a[href='https://justiceuk.sharepoint.com/sites/prisons-digital/SitePages/Official%20Visits.aspx']",
        ).filter((_, link) => $(link).text().includes('SharePoint page'))
        expect(bannerLink.length).toBe(1)
      })
  })

  it('should show alternative NOMIS switch-off banner when prison is enabled in feature toggle and is a BVLS prison', () => {
    config.featureToggles.nomisSwitchOffPrisons = 'MDI'
    bookAVideoLinkService.getPrisons.mockResolvedValue([mockMoorlandBvlsPrison])

    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        expect(res.text).toContain(
          'You must now use DPS to book and manage official visits. The Visits screens in NOMIS have now been switched off at your prison. For BVLS sites, ',
        )
        const bannerLink = $(
          "a[href='https://justiceuk.sharepoint.com/sites/prisons-digital/SitePages/Official%20Visits.aspx']",
        ).filter((_, link) => $(link).text().includes('SharePoint page'))
        expect(bannerLink.length).toBe(1)
      })
  })

  it('should not show NOMIS switch-off banner when prison is not enabled in feature toggle', () => {
    config.featureToggles.nomisSwitchOffPrisons = 'LEI'

    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        expect(res.text).not.toContain(
          'You must now use DPS to book and manage official visits. The Visits screens in NOMIS have now been switched off at your prison',
        )
        const bannerLink = $(
          "a[href='https://justiceuk.sharepoint.com/sites/prisons-digital/SitePages/Official%20Visits.aspx']",
        ).filter((_, link) => $(link).text().includes('SharePoint page'))
        expect(bannerLink.length).toBe(0)
      })
  })

  it('user should see a scheduled maintenance screen', () => {
    config.maintenanceMode = true
    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(res => {
        const $ = cheerio.load(res.text)
        const heading = getPageHeader($)

        expect(heading).toContain('Sorry, scheduled maintenance affects this service')
      })
  })
})

describe('GET /home - visits that need review card', () => {
  const appForRole = (role: AuthorisedRoles) =>
    appWithAllRoutes({
      services: { auditService, officialVisitsService },
      userSupplier: () => ({
        ...createUserWithCaseLoad({
          activeCaseLoadId: 'MDI',
          activeCaseLoadDescription: 'Moorland (HMP & YOI)',
        }),
        userRoles: [role],
      }),
    })

  it.each([
    [AuthorisedRoles.MANAGE, true],
    [AuthorisedRoles.VIEW, true],
    [AuthorisedRoles.ADMIN, false],
    [AuthorisedRoles.DEFAULT, false],
  ])('should show the card for %s: %s', (role, visible) => {
    officialVisitsService.countVisitsForReview.mockResolvedValue(3)
    app = appForRole(role)

    return request(app)
      .get('/')
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        const card = getByDataQa($, 'visits-need-review-card')

        if (visible) {
          expect(card.find('.card__link').text()).toContain('Official visits that need review')
          expect(card.find('.card__link').attr('href')).toBe('/review/list')
        } else {
          expect(card.find('.card__link').text()).toBe('')
        }
      })
  })

  it('should not show the card when the prison is not enabled for visits needing review', () => {
    config.featureToggles.visitsNeedReviewPrisons = ''
    officialVisitsService.countVisitsForReview.mockResolvedValue(3)
    app = appForRole(AuthorisedRoles.MANAGE)

    return request(app)
      .get('/')
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        expect(getByDataQa($, 'visits-need-review-card').find('.card__link').text()).toBe('')
        expect(officialVisitsService.countVisitsForReview).not.toHaveBeenCalled()
      })
  })

  it('should show the count of visits needing review', () => {
    officialVisitsService.countVisitsForReview.mockResolvedValue(7)
    app = appForRole(AuthorisedRoles.MANAGE)

    return request(app)
      .get('/')
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        expect(getByDataQa($, 'visits-need-review-count').text()).toContain('7')
      })
  })

  it.each([
    ['there is nothing to review', 0],
    ['the count cannot be retrieved', new Error('API unavailable')],
  ])('should show the card without a count when %s', (_label, outcome) => {
    if (outcome instanceof Error) officialVisitsService.countVisitsForReview.mockRejectedValue(outcome)
    else officialVisitsService.countVisitsForReview.mockResolvedValue(outcome)
    app = appForRole(AuthorisedRoles.MANAGE)

    return request(app)
      .get('/')
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        expect(getByDataQa($, 'visits-need-review-card').find('.card__link').text()).toContain(
          'Official visits that need review',
        )
        expect(getByDataQa($, 'visits-need-review-count')).toHaveLength(0)
      })
  })

  it('should not call the API for a user without permission to see the card', async () => {
    app = appForRole(AuthorisedRoles.ADMIN)

    await request(app).get('/').expect(200)

    expect(officialVisitsService.countVisitsForReview).not.toHaveBeenCalled()
  })
})
