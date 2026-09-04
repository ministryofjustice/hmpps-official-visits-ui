import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import componentsApi from '../mockApis/componentsApi'
import manageUsersApi from '../mockApis/manageUsersApi'
import prisonApi from '../mockApis/prisonApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { login, resetStubs } from '../testUtils'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import VisitsNeedReviewPage from '../pages/visitsNeedReviewPage'
import CancelVisitPage from '../pages/cancelVisitPage'
import { NotAuthorisedPage } from '../pages/notAuthorisedPage'
import { completionCodes } from '../mockData/data'
import { VisitForReview, VisitForReviewIssueType } from '../../server/@types/officialVisitsApi/types'

const URL = '/review/list'

const review = ({
  officialVisitId,
  firstName = 'John',
  lastName = 'Smith',
  prisonerNumber = 'A1337AA',
  visitDate = '2026-09-02',
  startTime = '09:00',
  endTime = '09:30',
  issueTypes,
}: {
  officialVisitId: number
  firstName?: string
  lastName?: string
  prisonerNumber?: string
  visitDate?: string
  startTime?: string
  endTime?: string
  issueTypes: VisitForReviewIssueType[]
}) =>
  ({
    visit: {
      officialVisitId,
      prisonCode: 'LEI',
      visitStatus: 'SCHEDULED',
      visitTypeCode: 'IN_PERSON',
      visitTypeDescription: 'In person',
      visitDate,
      startTime,
      endTime,
      dpsLocationId: 'loc-1',
      locationDescription: 'Visits Hall',
      createdBy: 'TEST_USER',
      createdTime: '2026-01-02T14:45:00',
      prisonerVisited: { prisonerNumber, prisonCode: 'LEI', firstName, lastName },
    },
    issues: issueTypes.map((issueType, index) => ({
      visitReviewDetailId: officialVisitId * 10 + index,
      issueType,
      raisedTime: '2026-01-02T09:00:00',
    })),
  }) as VisitForReview

const loginAsViewOnly = (page: Parameters<typeof login>[0]) =>
  login(page, {
    name: 'AUser',
    roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.VIEW}`],
    active: true,
    authSource: 'nomis',
  })

test.describe('Official visits that need review', () => {
  test.beforeEach(async () => {
    await resetStubs()
    await hmppsAuth.stubSignInPage()
    await manageUsersApi.stubGetByUsername()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
  })

  test('should list visits with their reasons, actions and the checks reveal', async ({ page }) => {
    const singles: [VisitForReviewIssueType, string][] = [
      ['PRISONER_RELEASED', 'Prisoner released'],
      ['PRISONER_TRANSFERRED', 'Prisoner transferred'],
      ['VISITOR_NOT_APPROVED', 'Contact not approved'],
      ['VISITOR_NO_RELATIONSHIP', 'Unauthorised visitor'],
      ['VISITOR_NOT_OFFICIAL', 'Social visitor'],
      ['PRISONER_NEW_ALERT', 'New alert'],
      ['PRISONER_NEW_RESTRICTION', 'New restriction'],
    ]

    await officialVisitsApi.stubVisitsForReview([
      ...singles.map(([issueType], index) =>
        review({
          officialVisitId: index + 1,
          lastName: `Prisoner${String(index + 1).padStart(2, '0')}`,
          firstName: 'Test',
          prisonerNumber: `A000${index + 1}AA`,
          issueTypes: [issueType],
        }),
      ),
      review({
        officialVisitId: 99,
        firstName: 'Jane',
        lastName: 'Doe',
        prisonerNumber: 'A1111AA',
        issueTypes: ['PRISONER_NEW_ALERT', 'PRISONER_NEW_RESTRICTION', 'VISITOR_NOT_OFFICIAL'],
      }),
    ])

    await login(page)
    await page.goto(URL)
    const reviewPage = await VisitsNeedReviewPage.verifyOnPage(page)

    await expect(reviewPage.resultsSummary).toContainText('You have 8 visits to review')
    await expect(reviewPage.getRows()).toHaveCount(8)

    const firstRow = reviewPage.getRowFor('Prisoner01, Test')
    await expect(firstRow).toContainText('A0001AA')
    await expect(firstRow).toContainText('09:00 to 09:30')
    await expect(firstRow).toContainText('2 Sep 2026')
    await expect(firstRow.getByRole('link').first()).toHaveAttribute('href', /\/prisoner\/A0001AA$/)

    for (let index = 0; index < singles.length; index += 1) {
      const [, label] = singles[index]
      // eslint-disable-next-line no-await-in-loop
      await expect(reviewPage.getReasonTagsFor(`Prisoner${String(index + 1).padStart(2, '0')}, Test`)).toHaveText([
        label,
      ])
    }

    await expect(reviewPage.getReasonTagsFor('Doe, Jane')).toHaveText([
      'Social visitor',
      'New alert',
      'New restriction',
    ])

    await expect(reviewPage.getActionsFor('Prisoner01, Test')).toContainText('Cancel visit')
    await expect(reviewPage.getActionsFor('Prisoner02, Test')).toContainText('Cancel visit')
    await expect(reviewPage.getActionsFor('Prisoner03, Test')).not.toContainText('Cancel visit')

    await page.getByRole('group').getByText('Which checks are done to create this list?').click()
    await expect(reviewPage.whichChecksDetails).toContainText('prisoner is released')
    await expect(reviewPage.whichChecksDetails).toContainText('visitor is a social visitor')
    await expect(reviewPage.whichChecksDetails).not.toContainText('date is no longer available')
  })

  test('should show the empty state when nothing needs review', async ({ page }) => {
    await officialVisitsApi.stubVisitsForReview([])

    await login(page)
    await page.goto(URL)
    const reviewPage = await VisitsNeedReviewPage.verifyOnPage(page)

    await expect(reviewPage.noResults).toHaveText('There are no official visits that need review.')
    await expect(reviewPage.getRows()).toHaveCount(0)
  })

  test('should return to the review list from Cancel visit, both on back and after cancelling', async ({ page }) => {
    await officialVisitsApi.stubVisitsForReview([review({ officialVisitId: 1, issueTypes: ['PRISONER_RELEASED'] })])
    await officialVisitsApi.stubRefData('VIS_COMPLETION', completionCodes)
    await officialVisitsApi.stubCancelVisit({}, 'LEI')

    await login(page)
    await page.goto(URL)
    const reviewPage = await VisitsNeedReviewPage.verifyOnPage(page)

    await reviewPage.getActionsFor('Smith, John').getByRole('link', { name: 'Cancel visit' }).click()
    await CancelVisitPage.verifyOnPage(page)
    await expect(page.getByRole('link', { name: 'Cancel and return to visits in review' })).toBeVisible()

    await page.locator('a.govuk-back-link').click()
    await VisitsNeedReviewPage.verifyOnPage(page)
    expect(new globalThis.URL(page.url()).pathname).toBe(URL)

    await reviewPage.getActionsFor('Smith, John').getByRole('link', { name: 'Cancel visit' }).click()
    await CancelVisitPage.verifyOnPage(page)
    await page.getByRole('radio').first().click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await VisitsNeedReviewPage.verifyOnPage(page)
    expect(new globalThis.URL(page.url()).pathname).toBe(URL)
  })

  test('should hide mutating actions from a view only user and refuse the cancel url', async ({ page }) => {
    await officialVisitsApi.stubVisitsForReview([review({ officialVisitId: 1, issueTypes: ['PRISONER_RELEASED'] })])
    await officialVisitsApi.stubRefData('VIS_COMPLETION', completionCodes)

    await loginAsViewOnly(page)
    await page.goto(URL)
    const reviewPage = await VisitsNeedReviewPage.verifyOnPage(page)

    const actions = reviewPage.getActionsFor('Smith, John')
    await expect(actions).toContainText('View')
    await expect(actions).not.toContainText('Acknowledge')
    await expect(actions).not.toContainText('Cancel visit')

    await page.goto('/view/visit/1/cancel')
    await NotAuthorisedPage.verifyOnPage(page)
  })

  test('should page the list at ten visits a page', async ({ page }) => {
    await officialVisitsApi.stubVisitsForReview(
      Array.from({ length: 12 }, (_, index) =>
        review({
          officialVisitId: index + 1,
          lastName: `Prisoner${String(index + 1).padStart(2, '0')}`,
          firstName: 'Test',
          issueTypes: ['PRISONER_RELEASED'],
        }),
      ),
    )

    await login(page)
    await page.goto(URL)
    const reviewPage = await VisitsNeedReviewPage.verifyOnPage(page)

    await expect(reviewPage.resultsSummary).toContainText('You have 12 visits to review (page 1 of 2)')
    await expect(reviewPage.getRows()).toHaveCount(10)

    await reviewPage.getNextPageLink().click()

    await expect(reviewPage.resultsSummary).toContainText('page 2 of 2')
    await expect(reviewPage.getRows()).toHaveCount(2)
  })

  test('should acknowledge a visit using its official visit id and return to the list', async ({ page }) => {
    await officialVisitsApi.stubVisitsForReview([review({ officialVisitId: 77, issueTypes: ['PRISONER_RELEASED'] })])
    await officialVisitsApi.stubAcknowledgeVisitReview('LEI', 77)

    await login(page)
    await page.goto(URL)
    await VisitsNeedReviewPage.verifyOnPage(page)

    await page.getByRole('button', { name: 'Acknowledge' }).click()

    await VisitsNeedReviewPage.verifyOnPage(page)
    expect(new globalThis.URL(page.url()).pathname).toBe(URL)
  })
})
