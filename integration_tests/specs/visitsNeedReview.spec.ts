import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import componentsApi from '../mockApis/componentsApi'
import manageUsersApi from '../mockApis/manageUsersApi'
import prisonApi from '../mockApis/prisonApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { login, resetStubs } from '../testUtils'
import VisitsNeedReviewPage from '../pages/visitsNeedReviewPage'
import CancelVisitPage from '../pages/cancelVisitPage'
import { completionCodes } from '../mockData/data'
import { VisitForReview, VisitForReviewIssueType } from '../../server/@types/officialVisitsApi/types'

const REVIEW_LIST = '/review/list'

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
    await page.goto(REVIEW_LIST)
    const reviewPage = await VisitsNeedReviewPage.verifyOnPage(page)

    await expect(reviewPage.resultsSummary).toContainText('You have 8 visits to review')
    await expect(reviewPage.getRows()).toHaveCount(8)

    const firstRow = reviewPage.getRowFor('Prisoner01, Test')
    await expect(firstRow).toContainText('A0001AA')
    await expect(firstRow).toContainText('09:00 to 09:30')
    await expect(firstRow).toContainText('2 Sep 2026')
    await expect(firstRow.getByRole('link').first()).toHaveAttribute('href', /\/prisoner\/A0001AA$/)

    await expect(reviewPage.getAllReasonTags()).toHaveText([
      ...singles.map(([, label]) => label),
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

  test('should return to the review list from Cancel visit, both on back and after cancelling', async ({ page }) => {
    await officialVisitsApi.stubVisitsForReview([review({ officialVisitId: 1, issueTypes: ['PRISONER_RELEASED'] })])
    await officialVisitsApi.stubRefData('VIS_COMPLETION', completionCodes)
    await officialVisitsApi.stubCancelVisit({}, 'LEI')

    await login(page)
    await page.goto(REVIEW_LIST)
    const reviewPage = await VisitsNeedReviewPage.verifyOnPage(page)

    await reviewPage.getActionsFor('Smith, John').getByRole('link', { name: 'Cancel visit' }).click()
    await CancelVisitPage.verifyOnPage(page)
    await expect(page.getByRole('link', { name: 'Cancel and return to visits in review' })).toBeVisible()

    await page.locator('a.govuk-back-link').click()
    await VisitsNeedReviewPage.verifyOnPage(page)
    await expect(page).toHaveURL(REVIEW_LIST)

    await reviewPage.getActionsFor('Smith, John').getByRole('link', { name: 'Cancel visit' }).click()
    await CancelVisitPage.verifyOnPage(page)
    await page.getByRole('radio').first().click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await VisitsNeedReviewPage.verifyOnPage(page)
    await expect(page).toHaveURL(REVIEW_LIST)
  })
})
