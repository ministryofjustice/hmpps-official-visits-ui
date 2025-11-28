import { v4 as uuidV4 } from 'uuid'
import { expect, test } from '@playwright/test'
import { format } from 'date-fns'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs } from '../testUtils'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import PrisonerSearchPage from '../pages/prisonerSearchPage'
import componentsApi from '../mockApis/componentsApi'
import PrisonerSearchResultsPage from '../pages/prisonerSearchResultsPage'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import VisitTypePage from '../pages/visitTypePage'
import TimeSlotPage from '../pages/timeSlotPage'
import { AvailableTimeSlot } from '../../server/@types/officialVisitsApi/types'
import { mockOfficialVisitors, mockSocialVisitors } from '../../server/testutils/mocks'
import SelectOfficialContactPage from '../pages/selectOfficialContactPage'
import SelectSocialContactPage from '../pages/selectSocialContactPage'
import AssistanceRequiredPage from '../pages/assistanceRequiredPage'
import EquipmentPage from '../pages/equipmentPage'
import CommentsPage from '../pages/commentsPage'
import personalRelationshipsApi from '../mockApis/personalRelationshipsApi'

const mockPrisoner = {
  prisonerNumber: '1',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1969-01-01',
  cellLocation: 'LEI-1-1',
  pncNumber: '429',
  croNumber: '123456/12A',
  prisonCode: 'LEI',
}

test.describe('/example', () => {
  const uuid = uuidV4()
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonerSearchApi.stubGetByPrisonerNumber(mockPrisoner)
    await personalRelationshipsApi.stubRestrictions()
    await prisonerSearchApi.stubSearchInCaseload({
      content: [mockPrisoner],
      first: true,
      last: false,
      number: 1,
      totalPages: 1,
    })
    await officialVisitsApi.stubRefData('VIS_TYPE_CODE', [{ code: 'IN_PERSON', description: 'Phone' }])
    await officialVisitsApi.stubAvailableSlots([
      {
        visitSlotId: 1,
        timeSlotId: 1,
        dayCode: 'WED',
        startTime: '08:00',
        endTime: '17:00',
        dpsLocationId: 'OUT',
        maxAdults: '1',
        maxGroups: '1',
        description: 'Room 1',
        visitDate: format(new Date(), 'yyyy-MM-dd'),
      } as unknown as AvailableTimeSlot,
    ])
    await officialVisitsApi.stubOfficialContacts(mockOfficialVisitors)
    await officialVisitsApi.stubSocialContacts(mockSocialVisitors)
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('Happy path example', async ({ page }) => {
    await login(page)
    await page.goto(`/manage/create/${uuid}/search`)
    const prisonerSearchPage = await PrisonerSearchPage.verifyOnPage(page)
    await prisonerSearchPage.searchBox.fill('John')
    await prisonerSearchPage.searchButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/results/)
    const prisonerSearchResultsPage = await PrisonerSearchResultsPage.verifyOnPage(page)
    await prisonerSearchResultsPage.selectThisPrisoner()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/visit-type/)
    const visitTypePage = await VisitTypePage.verifyOnPage(page)
    await visitTypePage.selectRadioButton('Phone')
    await visitTypePage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/time-slot/)
    const timeSlotPage = await TimeSlotPage.verifyOnPage(page)
    await timeSlotPage.selectRadioButton('8am to 5pm Room 1')
    await timeSlotPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-official-visitors/)
    const selectOfficialContactPage = await SelectOfficialContactPage.verifyOnPage(page)
    await selectOfficialContactPage.checkContact(0)
    await selectOfficialContactPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/select-social-visitors/)
    const selectSocialContactPage = await SelectSocialContactPage.verifyOnPage(page)
    await selectSocialContactPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/assistance-required/)
    const assistanceRequiredPage = await AssistanceRequiredPage.verifyOnPage(page)
    await assistanceRequiredPage.selectCheckbox(
      `${mockOfficialVisitors[0].firstName} ${mockOfficialVisitors[0].lastName} (${mockOfficialVisitors[0].relationshipToPrisonerDescription})`,
    )
    await assistanceRequiredPage.fillBoxForContact(0, 'Assistance required')
    await assistanceRequiredPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/equipment/)
    const equipmentPage = await EquipmentPage.verifyOnPage(page)
    await equipmentPage.selectCheckbox(
      `${mockOfficialVisitors[0].firstName} ${mockOfficialVisitors[0].lastName} (${mockOfficialVisitors[0].relationshipToPrisonerDescription})`,
    )
    await equipmentPage.fillBoxForContact(0, 'Equipment required')
    await equipmentPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/comments/)
    const commentsPage = await CommentsPage.verifyOnPage(page)
    await commentsPage.continueButton.click()

    expect(page.url()).toMatch(/\/manage\/create\/.*\/check-your-answers/)
  })
})
