import { expect, test } from '@playwright/test'
import { format } from 'date-fns'
import { v4 as uuidV4 } from 'uuid'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs, summaryValue } from '../testUtils'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import componentsApi from '../mockApis/componentsApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import personalRelationshipsApi from '../mockApis/personalRelationshipsApi'
import prisonApi from '../mockApis/prisonApi'
import {
  mockOfficialVisitors,
  mockPrisonerRestrictions,
  mockScheduleTimeSlots,
  mockSocialVisitors,
  mockVisitByIdVisit,
} from '../../server/testutils/mocks'
import ViewVisitPage from '../pages/viewVisitPage'
import AmendVisitPage from '../pages/amendVisitPage'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import manageUsersApi from '../mockApis/manageUsersApi'
import { completionCodes, locations, mockPrisoner, searchLevels, statuses, visitTypes } from '../mockData/data'
import { NotAuthorisedPage } from '../pages/notAuthorisedPage'
import activitiesApi from '../mockApis/activitiesApi'
import { OfficialVisit } from '../../server/@types/officialVisitsApi/types'

const getMockVisit = () => ({
  ...mockVisitByIdVisit,
  visitDate: '2038-01-01',
  visitSlotId: 1,
  prisonCode: 'LEI',
  officialVisitors: [
    {
      assistanceNotes: 'Test assistance notes (official)',
      assistedVisit: true,
      firstName: mockOfficialVisitors[0].firstName,
      lastName: mockOfficialVisitors[0].lastName,
      officialVisitorId: mockOfficialVisitors[0].prisonerContactId,
      prisonerContactId: mockOfficialVisitors[0].prisonerContactId,
      contactId: mockOfficialVisitors[0].contactId,
      relationshipTypeCode: 'OFFICIAL',
      relationshipDescription: 'Solicitor',
      visitorTypeCode: 'CONTACT',
      relationshipTypeDescription: 'Official',
      relationshipCode: 'SOL',
      visitorTypeDescription: 'Contact',
      leadVisitor: true,
      createdBy: 'TEST_USER',
      createdTime: '2023-01-01T00:00:00',
      visitorEquipment: {
        description: 'Test equipment (official)',
      },
      emailAddress: 'test@test.com',
      phoneNumber: '0123456789',
    },
    {
      firstName: mockSocialVisitors[0].firstName,
      lastName: mockSocialVisitors[0].lastName,
      officialVisitorId: mockSocialVisitors[0].prisonerContactId,
      prisonerContactId: mockSocialVisitors[0].prisonerContactId,
      contactId: mockSocialVisitors[0].contactId,
      visitorTypeDescription: 'Contact',
      relationshipDescription: 'Brother',
      relationshipTypeCode: 'SOCIAL',
      relationshipTypeDescription: 'Social',
      relationshipCode: 'BRO',
      visitorTypeCode: 'CONTACT',
      leadVisitor: true,
      createdBy: 'TEST_USER',
      createdTime: '2023-01-01T00:00:00',
      assistedVisit: true,
      assistanceNotes: 'Test assistance notes (social)',
      visitorEquipment: {
        description: 'Test equipment (social)',
      },
    },
    {
      firstName: mockOfficialVisitors[2].firstName,
      lastName: mockOfficialVisitors[2].lastName,
      officialVisitorId: mockOfficialVisitors[2].prisonerContactId,
      prisonerContactId: mockOfficialVisitors[2].prisonerContactId,
      contactId: mockOfficialVisitors[2].contactId,
      relationshipTypeCode: 'OFFICIAL',
      relationshipDescription: 'Solicitor',
      relationshipCode: 'SOL',
      visitorTypeCode: 'CONTACT',
      relationshipTypeDescription: 'Official',
      visitorTypeDescription: 'Contact',
      leadVisitor: true,
      createdBy: 'TEST_USER',
      createdTime: '2023-01-01T00:00:00',
    },
    {
      firstName: mockSocialVisitors[2].firstName,
      lastName: mockSocialVisitors[2].lastName,
      officialVisitorId: mockSocialVisitors[2].prisonerContactId,
      prisonerContactId: mockSocialVisitors[2].prisonerContactId,
      contactId: mockSocialVisitors[2].contactId,
      visitorTypeDescription: 'Contact',
      relationshipDescription: 'Brother',
      relationshipTypeCode: 'SOCIAL',
      relationshipTypeDescription: 'Social',
      relationshipCode: 'BRO',
      visitorTypeCode: 'CONTACT',
      leadVisitor: true,
      createdBy: 'TEST_USER',
      createdTime: '2023-01-01T00:00:00',
    },
    // Get Chris Smith (not approved visitor)
    mockOfficialVisitors.find(o => !o.isApprovedVisitor)!,
    mockSocialVisitors.find(o => !o.isApprovedVisitor)!,
  ],
})

test.describe('Amend official visits', () => {
  const journeyId = uuidV4()

  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await manageUsersApi.stubGetByUsername()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await prisonerSearchApi.stubGetByPrisonerNumber({ ...mockPrisoner, prisonId: 'LEI' })
    await personalRelationshipsApi.stubRestrictions({ content: mockPrisonerRestrictions })
    await prisonerSearchApi.stubSearchInCaseload({
      content: [mockPrisoner],
      first: true,
      last: false,
      number: 1,
      totalPages: 1,
    })
    // We need the additional IN_PERSON option to test conditional equipment page
    await officialVisitsApi.stubRefData('VIS_TYPE', visitTypes)
    await officialVisitsApi.stubRefData('VIS_STATUS', statuses)
    await officialVisitsApi.stubRefData('VIS_COMPLETION', completionCodes)
    await officialVisitsApi.stubRefData('SEARCH_LEVEL', searchLevels)
    await activitiesApi.stubAvailableSlots(mockScheduleTimeSlots)
    await officialVisitsApi.stubAvailableSlots(
      locations.map((o, i) => {
        return {
          visitSlotId: i + 1,
          timeSlotId: i + 1,
          prisonCode: 'MDI',
          dayCode: 'WED',
          dayDescription: 'Wednesday',
          startTime: '08:00',
          endTime: '17:00',
          dpsLocationId: o.code,
          locationDescription: o.description,
          availableAdults: 1,
          availableGroups: 1,
          availableVideoSessions: 1,
          visitDate: format(new Date(), 'yyyy-MM-dd'),
        }
      }),
    )

    await officialVisitsApi.stubGetOfficialVisitById(getMockVisit() as OfficialVisit)
    await officialVisitsApi.stubAllContacts([...mockOfficialVisitors, ...mockSocialVisitors])

    await officialVisitsApi.stubUpdateVisitors('LEI', '1')
    await officialVisitsApi.stubUpdateVisitTypeAndSlot('LEI', '1')
    await officialVisitsApi.stubUpdateComments('LEI', '1')
    await officialVisitsApi.stubCheckForOverlappingVisits({
      prisonerNumber: 'G4793VF',
      overlappingPrisonerVisits: [],
      contacts: [],
    })
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('should deny access for DEFAULT role', async ({ page }) => {
    await login(page, { name: 'AUser', roles: [`ROLE_${AuthorisedRoles.DEFAULT}`], active: true, authSource: 'nomis' })
    await page.goto(`/manage/amend/1/${journeyId}`)

    await NotAuthorisedPage.verifyOnPage(page)
  })

  test('should deny access for VIEW role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.VIEW}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/manage/amend/1/${journeyId}`)
    await NotAuthorisedPage.verifyOnPage(page)
  })

  test('should display amend visit landing page', async ({ page }) => {
    await login(page)
    await page.goto(`/manage/amend/1/${journeyId}`)

    const amendVisitPage = await AmendVisitPage.verifyOnPage(page)

    await expect(page.locator('[data-qa="mini-profile-person-profile-link"]')).toHaveText('Harrison, Tim')
    await expect(page.locator('[data-qa="mini-profile-prisoner-number"]')).toHaveText('G4793VF')
    await expect(page.locator('[data-qa="mini-profile-dob"]')).toHaveText('27 June 1986')
    await expect(page.locator('[data-qa="mini-profile-cell-location"]')).toHaveText('2-1-007')
    await expect(page.locator('[data-qa="mini-profile-prison-name"]')).toHaveText('Example Prison (EXP)')
    await expect(page.locator('[data-qa="contact-G4793VF-alerts-restrictions"]')).toHaveText(
      /3\s*restrictions\s*and\s*0\s*alerts/,
    )

    await expect(summaryValue(page, 'Date')).toHaveText('Friday, 1 January 2038')
    await expect(summaryValue(page, 'Time')).toHaveText('10:00am to 11:00am (1 hour)')
    await expect(summaryValue(page, 'Visit status')).toHaveText('Scheduled')
    await expect(summaryValue(page, 'Visit reference number')).toHaveText('1')
    await expect(summaryValue(page, 'Location')).toHaveText('First Location')
    await expect(summaryValue(page, 'Visit type')).toHaveText('Video')
    await expect(summaryValue(page, 'Prisoner notes')).toHaveText('prisoner notes')
    await expect(summaryValue(page, 'Staff notes')).toHaveText('staff notes')
    await expect(summaryValue(page, 'Created by')).toHaveText('Test User (Monday, 19 January 2026)')
    await expect(summaryValue(page, 'Last modified')).toHaveText('Test User (Monday, 19 January 2026)')
    expect(summaryValue(page, 'Visitor concerns', 'visit level visitor concern notes')).toBeTruthy()

    await expect(summaryValue(page, 'Contact type').first()).toHaveText('Official')
    await expect(summaryValue(page, 'Does this visitor need assistance?').first()).toHaveText('Yes')
    await expect(summaryValue(page, 'Assistance details').first()).toHaveText('Test assistance notes (official)')
    await expect(summaryValue(page, 'Does this visitor need equipment?').first()).toHaveText('Yes')
    await expect(summaryValue(page, /Equipment/).first()).toHaveText('Test equipment (official)')
    await expect(summaryValue(page, 'Email').first()).toHaveText('test@test.com')
    await expect(summaryValue(page, 'Telephone number').first()).toHaveText('0123456789')

    await expect(summaryValue(page, 'Contact type').nth(1)).toHaveText('Social')
    await expect(summaryValue(page, 'Does this visitor need assistance?').nth(1)).toHaveText('Yes')
    await expect(summaryValue(page, 'Assistance details').nth(1)).toHaveText('Test assistance notes (social)')
    await expect(summaryValue(page, 'Does this visitor need equipment?').nth(1)).toHaveText('Yes')
    await expect(summaryValue(page, /Equipment/).nth(1)).toHaveText('Test equipment (social)')
    await expect(summaryValue(page, 'Email').nth(1)).toHaveText('None')
    await expect(summaryValue(page, 'Telephone number').nth(1)).toHaveText('None')

    await expect(page.locator('.govuk-summary-card__title > a').first()).toHaveText('Abe Smith')
    await expect(page.locator('.govuk-summary-card__title > a').first()).toHaveAttribute(
      'href',
      'http://localhost:9091/prisoner/G4793VF/contacts/manage/101/relationship/1',
    )

    await expect(page.locator('.govuk-summary-card__title > a').nth(1)).toHaveText('Abe Smith')
    await expect(page.locator('.govuk-summary-card__title > a').nth(1)).toHaveAttribute(
      'href',
      'http://localhost:9091/prisoner/G4793VF/contacts/manage/201/relationship/1',
    )

    // Verify change links are present
    await expect(page.getByRole('link', { name: 'Change   date of visit (Visit' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change   time of visit (Visit' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change   location of visit (Visit' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change   visit type (Visit' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change   prisoner notes (' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change   staff notes (' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change   whether assistance' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change   notes about the assistance required' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change   whether equipment is' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change   notes about the equipment required' }).first()).toBeVisible()

    await expect(amendVisitPage.getCancelButton()).toBeVisible()
  })

  test('should navigate to comments amend page', async ({ page }) => {
    await login(page)
    await page.goto(`/manage/amend/1/${journeyId}`)

    await AmendVisitPage.verifyOnPage(page)
    await page.getByRole('link', { name: 'Change   prisoner notes (' }).click()

    // Amend specific page changes
    expect(page.locator('h1', { hasText: `Add extra information (optional)` })).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Populated with existing values
    expect(await page.getByRole('textbox', { name: 'Staff notes' }).textContent()).toEqual('staff notes')
    expect(await page.getByRole('textbox', { name: 'Prisoner notes' }).textContent()).toEqual('prisoner notes')

    // Back should go back to amend overview page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.getByRole('link', { name: 'Change   prisoner notes (' }).click()

    // Cancel should go back to the amend overview page
    await page.getByRole('link', { name: 'Cancel and return to visit' }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.getByRole('link', { name: 'Change   prisoner notes (' }).click()

    // Can Save new values
    await page.getByRole('textbox', { name: 'Staff notes' }).fill('amended staff notes')
    await page.getByRole('textbox', { name: 'Prisoner notes' }).fill('amended prisoner notes')

    await page.getByRole('button', { name: 'Save' }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}`)
    expect(page.getByRole('region', { name: 'success: Visit amended' }))
  })

  test('should navigate to visit type and visit slot pages when amending visit type', async ({ page }) => {
    await login(page)
    await page.goto(`/manage/amend/1/${journeyId}`)

    await AmendVisitPage.verifyOnPage(page)
    await page.getByRole('link', { name: 'Change   visit type (Visit' }).click()

    // Amend specific page changes
    expect(page.locator('h1', { hasText: `What type of official visit?` })).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Pre-selected value
    expect(page.getByRole('radio', { name: 'Video', exact: true })).toBeChecked()

    // Back should go back to amend overview page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.getByRole('link', { name: 'Change   visit type (Visit' }).click()

    // Cancel should go back to the amend overview page
    await page.getByRole('link', { name: 'Cancel and return to visit' }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.getByRole('link', { name: 'Change   visit type (Visit' }).click()

    // Can Save new values
    await page.getByRole('radio', { name: 'Not video', exact: true }).check()

    await page.getByRole('button', { name: 'Continue' }).click()
    // Goes to time slot page with date query parameter to highlight the currently selected slot
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/time-slot?date=2038-01-01`)

    // Amend specific page changes
    expect(page.locator('h1', { hasText: `Select date and time of official visit` })).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()
    expect(page.getByRole('heading', { name: 'Friday 1 January 2038' })).toBeVisible()
    expect(await page.locator('.bapv-timetable-dates__date--selected').innerText()).toMatch(/Fri\s+1\s+January/)
    // Pre-selected value
    expect(page.getByRole('radio', { name: '8am to 5pm First Location' })).toBeChecked()

    // Back should go back to visit type page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/visit-type`)
    await page.getByRole('button', { name: 'Continue' }).click()

    // Can select a different time slot
    await page.getByRole('radio', { name: '8am to 5pm Second Location' }).check()
    await page.getByRole('button', { name: 'Save' }).click()

    expect(page.getByRole('region', { name: 'success: Visit amended' })).toBeVisible()
  })

  test('should navigate to time slot amend page only when changing time slot', async ({ page }) => {
    await login(page)
    await page.goto(`/manage/amend/1/${journeyId}`)

    await AmendVisitPage.verifyOnPage(page)
    await page.getByRole('link', { name: 'Change   date of visit (Visit' }).click()

    // Amend specific page changes
    expect(page.locator('h1', { hasText: `Select date and time of official visit` })).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()
    expect(page.getByRole('heading', { name: 'Friday 1 January 2038' })).toBeVisible()
    expect(await page.locator('.bapv-timetable-dates__date--selected').innerText()).toMatch(/Fri\s+1\s+January/)
    // Pre-selected value
    expect(page.getByRole('radio', { name: '8am to 5pm First Location' })).toBeChecked()

    // Back should go back to amend overview page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.getByRole('link', { name: 'Change   date of visit (Visit' }).click()

    // Can select a different time slot
    await page.getByRole('radio', { name: '8am to 5pm Second Location' }).check()
    await page.getByRole('button', { name: 'Save' }).click()

    expect(page.getByRole('region', { name: 'success: Visit amended' })).toBeVisible()
  })

  test('should navigate to official visitors and show all related pages when "add or remove visitors" is clicked', async ({
    page,
  }) => {
    await officialVisitsApi.stubAvailableSlots(
      locations.map((o, i) => {
        return {
          visitSlotId: i + 1,
          timeSlotId: i + 1,
          prisonCode: 'MDI',
          dayCode: 'WED',
          dayDescription: 'Wednesday',
          startTime: '08:00',
          endTime: '17:00',
          dpsLocationId: o.code,
          locationDescription: o.description,
          availableAdults: 999,
          availableGroups: 1,
          availableVideoSessions: 1,
          visitDate: format(new Date(), 'yyyy-MM-dd'),
        }
      }),
    )

    // Force IN_PERSON visit type to test conditional equipment page
    await officialVisitsApi.stubGetOfficialVisitById({ ...getMockVisit(), visitTypeCode: 'IN_PERSON' } as OfficialVisit)
    await login(page)
    await page.goto(`/manage/amend/1/${journeyId}`)

    await AmendVisitPage.verifyOnPage(page)
    await page.getByRole('link', { name: 'Add or remove visitors' }).click()

    // Verify navigation to visitors page
    expect(
      page.locator('h1', { hasText: `Select official visitors from the prisoner's approved contact list` }),
    ).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Back should go back to amend overview page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.getByRole('link', { name: 'Add or remove visitors' }).click()

    // Cancel should go back to amend overview page
    await page.getByRole('link', { name: 'Cancel and return to visit details' }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.getByRole('link', { name: 'Add or remove visitors' }).click()

    // Pre-selected value
    expect(page.getByRole('checkbox', { name: 'Abe Smith' })).toBeChecked()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith' })).not.toBeChecked()
    // Chris Smith should be visible and checked (unapproved but already on the visit)
    expect(page.getByRole('checkbox', { name: 'Chris Smith' })).toBeChecked()

    // Select another visitor
    await page.getByRole('checkbox', { name: 'Bertie Smith' }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    // Verify navigation to social visitors page
    expect(
      page.locator('h1', { hasText: `Select social visitors from the prisoner's approved contact list` }),
    ).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Back should go back to visitors page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/select-official-visitors`)
    await page.goto(`http://localhost:3007/manage/amend/1/${journeyId}/select-social-visitors`)

    // Pre-selected value
    expect(page.getByRole('checkbox', { name: 'Abe Smith' })).toBeChecked()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith' })).not.toBeChecked()
    // Chris Smith should be visible and checked (unapproved but already on the visit)
    expect(page.getByRole('checkbox', { name: 'Chris Smith' })).toBeChecked()

    // Select another visitor
    await page.getByRole('checkbox', { name: 'Bertie Smith' }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    // Verify navigation to assistance required page
    expect(
      page.locator('h1', { hasText: `Will visitors need assistance during their visit? (optional)` }),
    ).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Back should go back to social visitors page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/select-social-visitors`)
    await page.goBack()

    // Pre selected values
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Solicitor)' })).toBeChecked()
    expect(page.getByText('Test assistance notes (official)')).toBeVisible()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith (Police officer)' })).not.toBeChecked()
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Brother)' })).toBeChecked()
    expect(page.getByText('Test assistance notes (social)')).toBeVisible()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith (Brother)' })).not.toBeChecked()

    await page.getByRole('button', { name: 'Continue' }).click()

    // Verify navigation to equipment page
    expect(page.locator('h1', { hasText: `Will visitors have equipment with them? (optional)` })).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Back should go back to assistance required page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/assistance-required`)
    await page.goBack()

    // Pre selected values
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Solicitor)' })).toBeChecked()
    expect(page.getByText('Test equipment (official)')).toBeVisible()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith (Police officer)' })).not.toBeChecked()
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Brother)' })).toBeChecked()
    expect(page.getByText('Test equipment (social)')).toBeVisible()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith (Brother)' })).not.toBeChecked()

    await page.getByRole('button', { name: 'Save' }).click()
    expect(page.getByRole('region', { name: 'success: Visit amended' })).toBeVisible()
  })

  test('should navigate to official visitors and show all related pages when "add or remove visitors" is clicked (no equipment)', async ({
    page,
  }) => {
    await login(page)
    await page.goto(`/manage/amend/1/${journeyId}`)

    await AmendVisitPage.verifyOnPage(page)
    await page.getByRole('link', { name: 'Add or remove visitors' }).click()

    // Verify navigation to visitors page
    expect(
      page.locator('h1', { hasText: `Select official visitors from the prisoner's approved contact list` }),
    ).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Back should go back to amend overview page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.getByRole('link', { name: 'Add or remove visitors' }).click()

    // Cancel should go back to amend overview page
    await page.getByRole('link', { name: 'Cancel and return to visit details' }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.getByRole('link', { name: 'Add or remove visitors' }).click()

    // Pre-selected value
    expect(page.getByRole('checkbox', { name: 'Abe Smith' })).toBeChecked()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith' })).not.toBeChecked()
    // Chris Smith should be visible and checked (unapproved but already on the visit)
    expect(page.getByRole('checkbox', { name: 'Chris Smith' })).toBeChecked()

    // Select another visitor
    await page.getByRole('checkbox', { name: 'Bertie Smith' }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    // Verify navigation to social visitors page
    expect(
      page.locator('h1', { hasText: `Select social visitors from the prisoner's approved contact list` }),
    ).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Back should go back to visitors page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/select-official-visitors`)
    await page.goBack()

    // Pre-selected value
    expect(page.getByRole('checkbox', { name: 'Abe Smith' })).toBeChecked()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith' })).toBeChecked()

    // Select another visitor
    await page.getByRole('checkbox', { name: 'Bertie Smith' }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    // Verify navigation to assistance required page
    expect(
      page.locator('h1', { hasText: `Will visitors need assistance during their visit? (optional)` }),
    ).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Back should go back to social visitors page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/select-social-visitors`)
    await page.goBack()

    // Pre selected values
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Solicitor)' })).toBeChecked()
    expect(page.getByText('Test assistance notes (official)')).toBeVisible()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith (Police officer)' })).not.toBeChecked()
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Brother)' })).toBeChecked()
    expect(page.getByText('Test assistance notes (social)')).toBeVisible()
    expect(page.getByRole('checkbox', { name: 'Bertie Smith (Brother)' })).not.toBeChecked()

    await page.getByRole('button', { name: 'Save' }).click()
    expect(page.getByRole('region', { name: 'success: Visit amended' })).toBeVisible()
  })

  test('should navigate to assistance required page when "change assistance notes" is clicked', async ({ page }) => {
    await login(page)
    await page.goto(`/manage/amend/1/${journeyId}`)

    await AmendVisitPage.verifyOnPage(page)
    await page.getByRole('link', { name: 'Change   notes about the' }).first().click()

    // Verify navigation to assistance required page
    expect(
      page.locator('h1', { hasText: `Will visitors need assistance during their visit? (optional)` }),
    ).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Back should go back to amend visit overview page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.goBack()

    // Pre selected values
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Solicitor)' })).toBeChecked()
    expect(page.getByText('Test assistance notes (official)')).toBeVisible()
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Brother)' })).toBeChecked()
    expect(page.getByText('Test assistance notes (social)')).toBeVisible()

    await page.getByRole('button', { name: 'Save' }).click()
    expect(page.getByRole('region', { name: 'success: Visit amended' })).toBeVisible()
  })

  test('should navigate to equipment page when "change assistance notes" is clicked', async ({ page }) => {
    await login(page)
    await page.goto(`/manage/amend/1/${journeyId}`)

    await AmendVisitPage.verifyOnPage(page)
    await page.getByRole('link', { name: 'Change   notes about the equipment' }).first().click()

    // Verify navigation to assistance required page
    expect(page.locator('h1', { hasText: `Will visitors have equipment with them? (optional)` })).toBeVisible()
    expect(page.locator('.govuk-hint', { hasText: 'Amend an official visit' })).toBeVisible()
    expect(page.locator('.moj-progress-bar')).not.toBeVisible()

    // Back should go back to amend visit overview page
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(`http://localhost:3007/manage/amend/1/${journeyId}/`)
    await page.goBack()

    // Pre selected values
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Solicitor)' })).toBeChecked()
    expect(page.getByText('Test equipment (official)')).toBeVisible()
    expect(page.getByRole('checkbox', { name: 'Abe Smith (Brother)' })).toBeChecked()
    expect(page.getByText('Test equipment (social)')).toBeVisible()

    await page.getByRole('button', { name: 'Save' }).click()
    expect(page.getByRole('region', { name: 'success: Visit amended' })).toBeVisible()
  })

  test('should cancel and return to visit details', async ({ page }) => {
    await login(page)
    await page.goto(`/manage/amend/1/${journeyId}/?backTo=${btoa('/view/visit/1')}`)

    const amendVisitPage = await AmendVisitPage.verifyOnPage(page)
    await amendVisitPage.getCancelButton().click()

    expect(page.url()).toContain('/view/visit/1')
    await ViewVisitPage.verifyOnPage(page)
  })
})
