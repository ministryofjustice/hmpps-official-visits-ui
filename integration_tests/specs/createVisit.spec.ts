import { v4 as uuidV4 } from 'uuid'
import { expect, Page, test } from '@playwright/test'
import { format } from 'date-fns'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs } from '../testUtils'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import PrisonerSearchPage from '../pages/prisonerSearchPage'
import componentsApi from '../mockApis/componentsApi'
import PrisonerSearchResultsPage from '../pages/prisonerSearchResultsPage'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import activitiesApi from '../mockApis/activitiesApi'
import VisitTypePage from '../pages/visitTypePage'
import TimeSlotPage from '../pages/timeSlotPage'
import { AvailableSlot, OfficialVisit } from '../../server/@types/officialVisitsApi/types'
import {
  mockOfficialVisitors,
  mockSocialVisitors,
  mockScheduleTimeSlots,
  mockVisitByIdVisit,
} from '../../server/testutils/mocks'
import SelectOfficialContactPage from '../pages/selectOfficialContactPage'
import SelectSocialContactPage from '../pages/selectSocialContactPage'
import AssistanceRequiredPage from '../pages/assistanceRequiredPage'
import EquipmentPage from '../pages/equipmentPage'
import CommentsPage from '../pages/commentsPage'
import personalRelationshipsApi from '../mockApis/personalRelationshipsApi'
import prisonApi from '../mockApis/prisonApi'
import CheckYourAnswersPage from '../pages/checkYourAnswersPage'
import ConfirmationPage from '../pages/confirmationPage'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import { NotAuthorisedPage } from '../pages/notAuthorisedPage'
import CancellationCheckPage from '../pages/cancellationCheckPage'
import AbstractPage from '../pages/abstractPage'

const mockPrisoner = {
  prisonerNumber: 'A1111AA',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1969-01-01',
  cellLocation: 'LEI-1-1',
  pncNumber: '429',
  croNumber: '123456/12A',
  prisonId: 'LEI',
}

// All routes under Create are guarded, however we only need to test the journey initialiser page since that sets up data needed for the rest of the journey.
// Confirmation is the only exception here because it doesn't rely on journey data and fetches data itself.
test.describe('RBAC: Create an official visit', async () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
  })
  test('should deny access to users with only DEFAULT role', async ({ page }) => {
    await login(page, { name: 'AUser', roles: [`ROLE_${AuthorisedRoles.DEFAULT}`], active: true, authSource: 'nomis' })
    await page.goto(`/manage/create/search`)
    await NotAuthorisedPage.verifyOnPage(page)

    await page.goto(`/manage/create/${uuidV4()}/confirmation/1`)
    await NotAuthorisedPage.verifyOnPage(page)
  })

  test('should deny access to users with only CONTACTS_AUTHORISER  abd DEFAULT roles', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.CONTACTS_AUTHORISER}`, `ROLE_${AuthorisedRoles.DEFAULT}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/manage/create/search`)
    await NotAuthorisedPage.verifyOnPage(page)

    await page.goto(`/manage/create/${uuidV4()}/confirmation/1`)
    await NotAuthorisedPage.verifyOnPage(page)
  })

  test('should deny access to users with only VIEW role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.VIEW}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/manage/create/search`)
    await NotAuthorisedPage.verifyOnPage(page)

    await page.goto(`/manage/create/${uuidV4()}/confirmation/1`)
    await NotAuthorisedPage.verifyOnPage(page)
  })

  test('should deny access to users with only ADMIN role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.ADMIN}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/manage/create/search`)
    await NotAuthorisedPage.verifyOnPage(page)

    await page.goto(`/manage/create/${uuidV4()}/confirmation/1`)
    await NotAuthorisedPage.verifyOnPage(page)
  })
})

test.describe('Create an official visit', () => {
  const uuid = uuidV4()
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await prisonerSearchApi.stubGetByPrisonerNumber(mockPrisoner)
    await personalRelationshipsApi.stubRestrictions()
    await prisonerSearchApi.stubSearchInCaseload({
      content: [mockPrisoner],
      first: true,
      last: false,
      number: 1,
      totalPages: 1,
    })
    await officialVisitsApi.stubRefData('VIS_TYPE', [{ code: 'IN_PERSON', description: 'In person' }])
    await activitiesApi.stubAvailableSlots(mockScheduleTimeSlots)
    await officialVisitsApi.stubAvailableSlots([
      {
        visitSlotId: 1,
        timeSlotId: 1,
        prisonCode: 'MDI',
        dayCode: 'WED',
        dayDescription: 'Wednesday',
        startTime: '08:00',
        endTime: '17:00',
        dpsLocationId: 'xxx',
        locationDescription: 'Legal visits room 2',
        availableAdults: 1,
        availableGroups: 1,
        availableVideoSessions: 1,
        visitDate: format(new Date(), 'yyyy-MM-dd'),
      } as AvailableSlot,
    ])
    await officialVisitsApi.stubOfficialContacts(mockOfficialVisitors)
    await officialVisitsApi.stubSocialContacts(mockSocialVisitors)
    await officialVisitsApi.stubCreateVisit({ officialVisitId: 1 } as OfficialVisit)
    await officialVisitsApi.stubGetOfficialVisitById(mockVisitByIdVisit)
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('Happy path example with CONTACTS_AUTHORISER role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: ['ROLE_PRISON', `ROLE_${AuthorisedRoles.MANAGE}`, `ROLE_${AuthorisedRoles.CONTACTS_AUTHORISER}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/manage/create/${uuid}/search`)
    const prisonerSearchPage = await PrisonerSearchPage.verifyOnPage(page)

    await checkCancelPage(prisonerSearchPage, PrisonerSearchPage.verifyOnPage, 0)

    await prisonerSearchPage.searchBox.fill('John')
    await prisonerSearchPage.searchButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/results/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/results/)

    const prisonerSearchResultsPage = await PrisonerSearchResultsPage.verifyOnPage(page)
    await prisonerSearchResultsPage.selectThisPrisoner()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/visit-type/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/visit-type/)

    const visitTypePage = await VisitTypePage.verifyOnPage(page)
    await checkCancelPage(visitTypePage, VisitTypePage.verifyOnPage, 1)
    await visitTypePage.selectRadioButton('In person')
    await visitTypePage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/time-slot/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/time-slot/)

    const timeSlotPage = await TimeSlotPage.verifyOnPage(page)
    await checkCancelPage(timeSlotPage, TimeSlotPage.verifyOnPage, 1)
    await timeSlotPage.selectRadioButton('8am to 5pm Legal Visits Room 2 Groups 1, people 1, video 1')
    await timeSlotPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-official-visitors/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-official-visitors/)
    // Do not show link to Contacts if the user doesn't have the 'Contacts Authoriser' role
    await expect(page.getByText('If you cannot find the contact in the list')).toBeVisible()

    const selectOfficialContactPage = await SelectOfficialContactPage.verifyOnPage(page)
    await checkCancelPage(selectOfficialContactPage, SelectOfficialContactPage.verifyOnPage, 2)
    await selectOfficialContactPage.checkContact(0)
    await selectOfficialContactPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-social-visitors/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-social-visitors/)
    // Do not show link to Contacts if the user doesn't have the 'Contacts Authoriser' role
    await expect(page.getByText('If you cannot find the contact in the list')).toBeVisible()

    const selectSocialContactPage = await SelectSocialContactPage.verifyOnPage(page)
    await checkCancelPage(selectSocialContactPage, SelectSocialContactPage.verifyOnPage, 2)
    await selectSocialContactPage.checkContact(1)
    await selectSocialContactPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/assistance-required/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/assistance-required/)

    const assistanceRequiredPage = await AssistanceRequiredPage.verifyOnPage(page)
    await checkCancelPage(assistanceRequiredPage, AssistanceRequiredPage.verifyOnPage, 3)
    await assistanceRequiredPage.selectCheckbox(
      `${mockOfficialVisitors[0].firstName} ${mockOfficialVisitors[0].lastName} (${mockOfficialVisitors[0].relationshipToPrisonerDescription})`,
    )
    await assistanceRequiredPage.fillBoxForContact(0, 'Assistance required')

    await assistanceRequiredPage.selectCheckbox(
      `${mockSocialVisitors[1].firstName} ${mockSocialVisitors[1].lastName} (${mockSocialVisitors[1].relationshipToPrisonerDescription})`,
    )
    await assistanceRequiredPage.fillBoxForContact(1, 'Assistance required (social)')
    await assistanceRequiredPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/equipment/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/equipment/)

    const equipmentPage = await EquipmentPage.verifyOnPage(page)
    await checkCancelPage(equipmentPage, EquipmentPage.verifyOnPage, 3)
    await equipmentPage.selectCheckbox(
      `${mockOfficialVisitors[0].firstName} ${mockOfficialVisitors[0].lastName} (${mockOfficialVisitors[0].relationshipToPrisonerDescription})`,
    )
    await equipmentPage.fillBoxForContact(0, 'Equipment required')

    await equipmentPage.selectCheckbox(
      `${mockSocialVisitors[1].firstName} ${mockSocialVisitors[1].lastName} (${mockSocialVisitors[1].relationshipToPrisonerDescription})`,
    )
    await equipmentPage.fillBoxForContact(1, 'Equipment required (social)')

    await equipmentPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/comments/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/comments/)

    const commentsPage = await CommentsPage.verifyOnPage(page)
    await checkCancelPage(commentsPage, CommentsPage.verifyOnPage, 3)
    await commentsPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/check-your-answers/)
    const cyaPage = await CheckYourAnswersPage.verifyOnPage(page)
    await checkCancelPage(cyaPage, CheckYourAnswersPage.verifyOnPage, 4)

    await cyaPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/confirmation\/1/)
    const confirmationPage = await ConfirmationPage.verifyOnPage(page)

    expect(await confirmationPage.caption.innerText()).toEqual('Prisoner: John Doe (A1111AA)')
    expect(await confirmationPage.page.getByText('You have successfully').innerText()).toEqual(
      'You have successfully scheduled an official visit with:',
    )
    expect(await confirmationPage.page.locator('#visit-details').innerText()).toEqual(
      'The visit will take place on Thursday, 1 January 2026 from 10am to 11am (1 hour) in First Location.',
    )
  })

  test('Happy path example with no CONTACTS_AUTHORISER role', async ({ page }) => {
    await login(page)
    await page.goto(`/manage/create/${uuid}/search`)
    const prisonerSearchPage = await PrisonerSearchPage.verifyOnPage(page)

    await checkCancelPage(prisonerSearchPage, PrisonerSearchPage.verifyOnPage, 0)

    await prisonerSearchPage.searchBox.fill('John')
    await prisonerSearchPage.searchButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/results/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/results/)

    const prisonerSearchResultsPage = await PrisonerSearchResultsPage.verifyOnPage(page)
    await prisonerSearchResultsPage.selectThisPrisoner()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/visit-type/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/visit-type/)

    const visitTypePage = await VisitTypePage.verifyOnPage(page)
    await checkCancelPage(visitTypePage, VisitTypePage.verifyOnPage, 1)
    await visitTypePage.selectRadioButton('In person')
    await visitTypePage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/time-slot/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/time-slot/)

    const timeSlotPage = await TimeSlotPage.verifyOnPage(page)
    await checkCancelPage(timeSlotPage, TimeSlotPage.verifyOnPage, 1)
    await timeSlotPage.selectRadioButton('8am to 5pm Legal Visits Room 2 Groups 1, people 1, video 1')
    await timeSlotPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-official-visitors/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-official-visitors/)
    // Do not show link to Contacts if the user doesn't have the 'Contacts Authoriser' role
    await expect(page.getByText('If you cannot find the contact in the list')).not.toBeVisible()

    const selectOfficialContactPage = await SelectOfficialContactPage.verifyOnPage(page)
    await checkCancelPage(selectOfficialContactPage, SelectOfficialContactPage.verifyOnPage, 2)
    await selectOfficialContactPage.checkContact(0)
    await selectOfficialContactPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-social-visitors/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-social-visitors/)
    // Do not show link to Contacts if the user doesn't have the 'Contacts Authoriser' role
    await expect(page.getByText('If you cannot find the contact in the list')).not.toBeVisible()

    const selectSocialContactPage = await SelectSocialContactPage.verifyOnPage(page)
    await checkCancelPage(selectSocialContactPage, SelectSocialContactPage.verifyOnPage, 2)
    await selectSocialContactPage.checkContact(1)
    await selectSocialContactPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/assistance-required/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/assistance-required/)

    const assistanceRequiredPage = await AssistanceRequiredPage.verifyOnPage(page)
    await checkCancelPage(assistanceRequiredPage, AssistanceRequiredPage.verifyOnPage, 3)
    await assistanceRequiredPage.selectCheckbox(
      `${mockOfficialVisitors[0].firstName} ${mockOfficialVisitors[0].lastName} (${mockOfficialVisitors[0].relationshipToPrisonerDescription})`,
    )
    await assistanceRequiredPage.fillBoxForContact(0, 'Assistance required')

    await assistanceRequiredPage.selectCheckbox(
      `${mockSocialVisitors[1].firstName} ${mockSocialVisitors[1].lastName} (${mockSocialVisitors[1].relationshipToPrisonerDescription})`,
    )
    await assistanceRequiredPage.fillBoxForContact(1, 'Assistance required (social)')
    await assistanceRequiredPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/equipment/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/equipment/)

    const equipmentPage = await EquipmentPage.verifyOnPage(page)
    await checkCancelPage(equipmentPage, EquipmentPage.verifyOnPage, 3)
    await equipmentPage.selectCheckbox(
      `${mockOfficialVisitors[0].firstName} ${mockOfficialVisitors[0].lastName} (${mockOfficialVisitors[0].relationshipToPrisonerDescription})`,
    )
    await equipmentPage.fillBoxForContact(0, 'Equipment required')

    await equipmentPage.selectCheckbox(
      `${mockSocialVisitors[1].firstName} ${mockSocialVisitors[1].lastName} (${mockSocialVisitors[1].relationshipToPrisonerDescription})`,
    )
    await equipmentPage.fillBoxForContact(1, 'Equipment required (social)')

    await equipmentPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/comments/)
    await page.goto(`/manage/create/${uuid}/check-your-answers`)
    expect(page.url()).toMatch(/\/manage\/create\/.*\/comments/)

    const commentsPage = await CommentsPage.verifyOnPage(page)
    await checkCancelPage(commentsPage, CommentsPage.verifyOnPage, 3)
    await commentsPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/check-your-answers/)
    const cyaPage = await CheckYourAnswersPage.verifyOnPage(page)
    await checkCancelPage(cyaPage, CheckYourAnswersPage.verifyOnPage, 4)

    await cyaPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/confirmation\/1/)
    const confirmationPage = await ConfirmationPage.verifyOnPage(page)

    expect(await confirmationPage.caption.innerText()).toEqual('Prisoner: John Doe (A1111AA)')
    expect(await confirmationPage.page.getByText('You have successfully').innerText()).toEqual(
      'You have successfully scheduled an official visit with:',
    )
    expect(await confirmationPage.page.locator('#visit-details').innerText()).toEqual(
      'The visit will take place on Thursday, 1 January 2026 from 10am to 11am (1 hour) in First Location.',
    )
  })
})

/** Check that cancel takes us to the cancellation check page with the correct steps checked and that "no" takes us back to the page we came from */
async function checkCancelPage(srcPage: AbstractPage, verify: (page: Page) => Promise<unknown>, stepsChecked: number) {
  await srcPage.cancelLink.click()
  expect(srcPage.page.url()).toMatch(new RegExp(`manage/create/.*/cancellation-check\\?stepsChecked=${stepsChecked}`))
  await (await CancellationCheckPage.verifyOnPage(srcPage.page)).noButton.click()
  await verify(srcPage.page)
}
