import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, flashProvider, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import ActivitiesService from '../../../../../services/activitiesService'
import { getPageHeader, getTextById } from '../../../../testutils/cheerio'
import { getJourneySession } from '../../../../testutils/testUtilRoute'
import { sortedMockScheduleEvents, mockPrisoner } from '../../../../../testutils/mocks'
import {
  expectErrorMessages,
  expectFlashMessage,
  expectNoErrorMessages,
  expectAlertErrors,
} from '../../../../testutils/expectErrorMessage'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')
jest.mock('../../../../../services/activitiesService')
jest.mock('../../../../../config', () => {
  const actual = jest.requireActual('../../../../../config')
  return {
    ...(actual.default || actual),
    featureToggles: {
      ...(actual.default || actual).featureToggles,
      twoMonthCalendarEnabled: true,
    },
  }
})

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const activitiesService = new ActivitiesService(null) as jest.Mocked<ActivitiesService>

let app: Express

const mockTimeslot = {
  timeSlotId: 1,
  visitSlotId: 1,
  visitDate: '2026-01-26',
  startTime: '13:30',
  endTime: '16:00',
  availableVideoSessions: 2,
  availableAdults: 3,
  availableGroups: 2,
}

const appSetup = (
  journeySession = {
    officialVisit: {
      prisoner: mockPrisoner,
      availableSlots: [mockTimeslot],
      visitType: 'IN_PERSON',
      selectedTimeSlot: mockTimeslot,
    } as Partial<OfficialVisitJourney>,
  },
) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService, activitiesService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
  appSetup()
  jest.useFakeTimers({
    now: new Date('2025-12-25'),
    // Tests time out when faking nextTick and setImmediate
    doNotFake: ['nextTick', 'setImmediate'],
  })

  officialVisitsService.getAvailableSlots.mockResolvedValue([
    {
      timeSlotId: 1,
      visitSlotId: 1,
      prisonCode: 'MDI',
      dayCode: 'MON',
      dayDescription: 'Monday',
      visitDate: '2025-12-25',
      startTime: '13:30',
      endTime: '16:00',
      dpsLocationId: 'loc1',
      availableVideoSessions: 2,
      availableAdults: 3,
      availableGroups: 2,
      locationDescription: 'Mock Location',
    },
  ])
  activitiesService.getPrisonersSchedule.mockResolvedValue(sortedMockScheduleEvents)
  officialVisitsService.checkForOverlappingVisits.mockResolvedValue({
    prisonerNumber: 'G4793VF',
    overlappingPrisonerVisits: [],
    contacts: [],
  })
  officialVisitsService.checkForNonAssociationVisits.mockResolvedValue([])
})

afterEach(() => {
  jest.resetAllMocks()
  jest.useRealTimers()
})

const UUID = journeyId()
const URL = `/manage/create/${UUID}/time-slot`

describe('Time slot handler', () => {
  describe('GET (create)', () => {
    it('should render the correct view page', async () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)
          const selectedDate = getTextById($, 'selected-date')

          expect($('.govuk-hint').text()).toEqual('Book an official visit')
          expect(heading).toEqual('Select date and time of official visit')
          expect(selectedDate).toEqual('Choose the visit time')

          // Calendar renders with month headings
          expect($('.hmpps-calendar').length).toEqual(1)
          expect($('.hmpps-calendar__month').length).toEqual(2)

          // Day headings are present (one per month)
          expect($('.hmpps-calendar__day-headings').length).toBeGreaterThan(0)
          // First month's day headings have 7 days
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').length).toEqual(7)
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(0).text()).toContain('Mon')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(1).text()).toContain('Tue')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(2).text()).toContain('Wed')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(3).text()).toContain('Thu')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(4).text()).toContain('Fri')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(5).text()).toContain('Sat')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(6).text()).toContain('Sun')

          // Calendar days are rendered - rest of December and all of January
          expect($('.hmpps-calendar__day').length).toEqual(38)

          // Default page shouldn't show previous month because it'll be in the past
          expect($('.hmpps-calendar__navigation').length).toBeTruthy()
          expect($('.hmpps-calendar__navigation a').length).toEqual(1)

          expect($('nav.hmpps-calendar').length).toEqual(0)
          expect($('section.hmpps-calendar').attr('aria-label')).toEqual('Select a visit date')

          expect($('.hmpps-calendar').children().eq(0).hasClass('hmpps-calendar__navigation')).toBe(true)

          expect($('.hmpps-calendar__navigation a span[aria-hidden="true"]').text()).toEqual('›')
          expect($('.hmpps-calendar__navigation a').contents().not('span').text().trim()).toEqual('Next Month')

          expect($('.hmpps-calendar__navigation a').hasClass('hmpps-calendar__navigation-next')).toBe(true)

          expect($('.hmpps-calendar__day[aria-current="date"]').length).toEqual(1)
          expect($('.hmpps-calendar__day[aria-current="date"]').hasClass('hmpps-calendar__day--selected')).toBe(true)
          expect($('.hmpps-calendar__day[aria-current="date"]').text()).toContain('Thursday 25 December 2025')

          expect($('.govuk-fieldset__heading').text()).toEqual('Select a time slot for Thursday, 25 December 2025')

          // Prisoner's schedule
          expect(getTextById($, 'prisoner-schedule-heading')).toEqual('John Smith’s schedule')

          // Schedule header
          expect($('.govuk-table__header').eq(0).text()).toEqual('Time')
          expect($('.govuk-table__header').eq(1).text()).toEqual('Event name')
          expect($('.govuk-table__header').eq(2).text()).toEqual('Type')
          expect($('.govuk-table__header').eq(3).text()).toEqual('Location')

          // Scheduled events
          expect($('.govuk-table__cell').eq(0).eq(0).text()).toEqual('08:00 to 17:00')
          expect($('.govuk-table__cell').eq(1).eq(0).text()).toEqual('Summary')
          expect($('.govuk-table__cell').eq(2).eq(0).text().trim()).toEqual('Appointment')
          expect($('.govuk-table__cell').eq(3).eq(0).text().trim()).toEqual('In cell')
          expect($('.govuk-table__cell').eq(4).eq(0).text()).toEqual(' to 17:00')
          expect($('.govuk-table__cell').eq(5).eq(0).text()).toEqual('Summary')
          expect($('.govuk-table__cell').eq(6).eq(0).text().trim()).toEqual('Appointment')
          expect($('.govuk-table__cell').eq(7).eq(0).text().trim()).toEqual('In cell')

          expect($('.govuk-radios__item').length).toEqual(1)
          expect($('.govuk-radios__item').eq(0).text()).toMatch(
            /13:30 to 16:00\s+Mock Location\s+Groups 2, people 3, video 2/,
          )
          expect($('.govuk-radios__input').eq(0).attr('value')).toEqual('1')

          expect($('.govuk-back-link').attr('href')).toEqual(`visit-type`)
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to homepage')
          expect($('.govuk-link').last().attr('href')).toContain(`cancellation-check?stepsChecked=1`)

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.TIME_SLOT_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('GET (amend)', () => {
    it('should render the correct view page', async () => {
      return request(app)
        .get(`/manage/amend/1/${UUID}/time-slot?change=true`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)
          const selectedDate = getTextById($, 'selected-date')

          expect($('.govuk-hint').text()).toEqual('Update an official visit')
          expect(heading).toEqual('Select date and time of official visit')
          expect(selectedDate).toEqual('Choose the visit time')

          // There should not be a progress tracker on this page
          expect($('.moj-progress-bar').length).toBeFalsy()

          // Calendar renders with month headings
          expect($('.hmpps-calendar').length).toEqual(1)
          expect($('.hmpps-calendar__month').length).toEqual(2)

          // Day headings are present (one per month)
          expect($('.hmpps-calendar__day-headings').length).toBeGreaterThan(0)
          // First month's day headings have 7 days
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').length).toEqual(7)
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(0).text()).toContain('Mon')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(1).text()).toContain('Tue')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(2).text()).toContain('Wed')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(3).text()).toContain('Thu')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(4).text()).toContain('Fri')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(5).text()).toContain('Sat')
          expect($('.hmpps-calendar__day-headings').eq(0).find('li').eq(6).text()).toContain('Sun')

          // Calendar days are rendered - rest of December and all of January
          expect($('.hmpps-calendar__day').length).toEqual(38)

          // Default page shouldn't show previous month because it'll be in the past
          expect($('.hmpps-calendar__navigation').length).toBeTruthy()
          expect($('.hmpps-calendar__navigation a').length).toEqual(1)

          expect($('nav.hmpps-calendar').length).toEqual(0)
          expect($('section.hmpps-calendar').attr('aria-label')).toEqual('Select a visit date')

          expect($('.hmpps-calendar').children().eq(0).hasClass('hmpps-calendar__navigation')).toBe(true)

          expect($('.hmpps-calendar__navigation a span[aria-hidden="true"]').text()).toEqual('›')
          expect($('.hmpps-calendar__navigation a').contents().not('span').text().trim()).toEqual('Next Month')

          expect($('.hmpps-calendar__navigation a').hasClass('hmpps-calendar__navigation-next')).toBe(true)

          expect($('.hmpps-calendar__day[aria-current="date"]').length).toEqual(1)
          expect($('.hmpps-calendar__day[aria-current="date"]').hasClass('hmpps-calendar__day--selected')).toBe(true)
          expect($('.hmpps-calendar__day[aria-current="date"]').text()).toContain('Thursday 25 December 2025')

          expect($('.govuk-fieldset__heading').text()).toEqual('Select a time slot for Thursday, 25 December 2025')

          // Prisoner's schedule
          expect(getTextById($, 'prisoner-schedule-heading')).toEqual('John Smith’s schedule')

          // Schedule header
          expect($('.govuk-table__header').eq(0).text()).toEqual('Time')
          expect($('.govuk-table__header').eq(1).text()).toEqual('Event name')
          expect($('.govuk-table__header').eq(2).text()).toEqual('Type')
          expect($('.govuk-table__header').eq(3).text()).toEqual('Location')

          // Scheduled events
          expect($('.govuk-table__cell').eq(0).eq(0).text()).toEqual('08:00 to 17:00')
          expect($('.govuk-table__cell').eq(1).eq(0).text()).toEqual('Summary')
          expect($('.govuk-table__cell').eq(2).eq(0).text().trim()).toEqual('Appointment')
          expect($('.govuk-table__cell').eq(3).eq(0).text().trim()).toEqual('In cell')
          expect($('.govuk-table__cell').eq(4).eq(0).text()).toEqual(' to 17:00')
          expect($('.govuk-table__cell').eq(5).eq(0).text()).toEqual('Summary')
          expect($('.govuk-table__cell').eq(6).eq(0).text().trim()).toEqual('Appointment')
          expect($('.govuk-table__cell').eq(7).eq(0).text().trim()).toEqual('In cell')

          expect($('.govuk-radios__item').length).toEqual(1)
          expect($('.govuk-radios__item').eq(0).text()).toMatch(
            /13:30 to 16:00\s+Mock Location\s+Groups 2, people 3, video 2/,
          )
          expect($('.govuk-radios__input').eq(0).attr('value')).toEqual('1')

          expect($('.govuk-back-link').attr('href')).toEqual(`./`)
          expect($('.govuk-button').text()).toContain('Save')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to visit details')
          expect($('.govuk-link').last().attr('href')).toContain(`./`)

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.TIME_SLOT_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should error on an empty submission', () => {
      return request(app)
        .post(URL)
        .send({ visitSlot: '' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'visitSlot',
              href: '#visitSlot',
              text: 'Select a date and time for the official visit',
            },
          ]),
        )
    })

    it('should error on an invalid time slot', () => {
      return request(app)
        .post(URL)
        .send({ visitSlot: 'NaN' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'visitSlot',
              href: '#visitSlot',
              text: 'Select a date and time for the official visit',
            },
          ]),
        )
    })

    it('should accept a valid time slot', async () => {
      await request(app)
        .post(URL)
        .send({ visitSlot: '1' })
        .expect(302)
        .expect('location', 'select-official-visitors')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.selectedTimeSlot).toEqual(mockTimeslot)
    })

    it('should redirect back to time slot page if there are overlapping visits', async () => {
      officialVisitsService.checkForOverlappingVisits.mockResolvedValue({
        prisonerNumber: 'G4793VF',
        overlappingPrisonerVisits: [123], // Has overlapping prisoner visits
        contacts: [],
      })

      await request(app)
        .post(URL)
        .set('Referer', URL)
        .send({ visitSlot: '1' })
        .expect(302)
        .expect('location', URL)
        .expect(() =>
          expectAlertErrors({
            hasPrisonerOverlap: true,
          }),
        )
    })

    it('should redirect back to time slot page if there are visitor overlaps', async () => {
      officialVisitsService.checkForOverlappingVisits.mockResolvedValue({
        prisonerNumber: 'G4793VF',
        overlappingPrisonerVisits: [], // No prisoner overlap
        contacts: [
          {
            contactId: 456,
            overlappingContactVisits: [789], // Has visitor overlap
          },
        ],
      })

      await request(app)
        .post(URL)
        .set('Referer', URL)
        .send({ visitSlot: '1' })
        .expect(302)
        .expect('location', URL)
        .expect(() =>
          expectAlertErrors({
            hasVisitorOverlap: true,
          }),
        )
    })

    it('should accept a valid time slot in amend mode', async () => {
      await request(app)
        .post(`/manage/amend/1/${UUID}/time-slot`)
        .send({ visitSlot: '1' })
        .expect(302)
        .expect('location', `/manage/amend/1/${journeyId()}`)
        .expect(() => expectFlashMessage('updateVerb', 'updated'))
    })

    it('should surface a visitInPast error when the API rejects amending a past visit', async () => {
      const referer = `/manage/amend/1/${UUID}/time-slot`
      officialVisitsService.getAvailableSlots.mockRejectedValue({
        data: { userMessage: "The from date must be on or after today's date" },
      })

      await request(app)
        .post(referer)
        .set('Referer', referer)
        .send({ visitSlot: '1' })
        .expect(302)
        .expect('location', referer)
        .expect(() => expectAlertErrors({ visitInPast: true }))

      expect(officialVisitsService.updateVisitTypeAndSlot).not.toHaveBeenCalled()
    })

    // ... (rest of the code remains the same)
    it('should call updateVisitTypeAndSlot service when in amend mode', async () => {
      const amendJourneySession = () => ({
        officialVisit: {
          prisoner: mockPrisoner,
          availableSlots: [
            {
              visitSlotId: 1,
              visitDate: '2025-12-25',
              startTime: '10:00',
              endTime: '11:00',
              dpsLocationId: 'location-1',
            },
          ],
          visitType: 'IN_PERSON',
          prisonCode: 'MDI',
          selectedTimeSlot: {
            timeSlotId: 1,
            visitSlotId: 1,
            visitDate: '2026-01-26',
            startTime: '13:30',
            endTime: '16:00',
            availableVideoSessions: 2,
            availableAdults: 3,
            availableGroups: 2,
          },
        },
      })

      appSetup(amendJourneySession() as { officialVisit: OfficialVisitJourney })

      await request(app)
        .post(`/manage/amend/1/${journeyId()}/time-slot`)
        .send({ visitSlot: '1' })
        .expect(302)
        .expect('location', `/manage/amend/1/${journeyId()}`)

      expect(officialVisitsService.updateVisitTypeAndSlot).toHaveBeenCalledWith(
        'MDI',
        '1',
        {
          prisonVisitSlotId: 1,
          visitDate: '2025-12-25',
          startTime: '10:00',
          endTime: '11:00',
          dpsLocationId: 'location-1',
          visitTypeCode: 'IN_PERSON',
        },
        user,
      )
    })
  })

  describe('POST (non-association check)', () => {
    const nonAssociateVisit = {
      prisonCode: 'MDI',
      officialVisitId: 23232323,
      visitDate: '2026-05-02',
      startTime: '10:00',
      endTime: '11:00',
      prisonerNumber: 'A1232DD',
      dpsLocationId: 'loc-9',
      locationDescription: 'Room 2',
      firstName: 'PAUL',
      lastName: 'CLARKE',
    }

    it('should warn and not proceed when a non-associate has a visit on the date', async () => {
      officialVisitsService.checkForNonAssociationVisits.mockResolvedValue([nonAssociateVisit])

      await request(app).post(URL).set('Referer', URL).send({ visitSlot: '1' }).expect(302).expect('location', URL)

      expect(officialVisitsService.checkForNonAssociationVisits).toHaveBeenCalledWith(
        'MDI',
        mockPrisoner.prisonerNumber,
        '2026-01-26',
        user,
      )
      expect(flashProvider).toHaveBeenCalledWith('nonAssociationVisits', JSON.stringify([nonAssociateVisit]))
      expect(officialVisitsService.updateVisitTypeAndSlot).not.toHaveBeenCalled()
    })

    it('should record the warned slot so submitting the same slot again proceeds', async () => {
      officialVisitsService.checkForNonAssociationVisits.mockResolvedValue([nonAssociateVisit])

      await request(app).post(URL).set('Referer', URL).send({ visitSlot: '1' }).expect(302).expect('location', URL)

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.nonAssociationWarningShownFor).toEqual('1|2026-01-26')
    })

    it('should proceed without warning when the same slot has already been warned about', async () => {
      officialVisitsService.checkForNonAssociationVisits.mockResolvedValue([nonAssociateVisit])
      appSetup({
        officialVisit: {
          prisoner: mockPrisoner,
          availableSlots: [mockTimeslot],
          visitType: 'IN_PERSON',
          selectedTimeSlot: mockTimeslot,
          nonAssociationWarningShownFor: '1|2026-01-26',
        } as Partial<OfficialVisitJourney>,
      })

      await request(app).post(URL).send({ visitSlot: '1' }).expect(302).expect('location', 'select-official-visitors')

      expect(officialVisitsService.checkForNonAssociationVisits).not.toHaveBeenCalled()
    })

    it('should warn again when a different slot was previously accepted', async () => {
      officialVisitsService.checkForNonAssociationVisits.mockResolvedValue([nonAssociateVisit])
      appSetup({
        officialVisit: {
          prisoner: mockPrisoner,
          availableSlots: [mockTimeslot],
          visitType: 'IN_PERSON',
          selectedTimeSlot: mockTimeslot,
          nonAssociationWarningShownFor: '1|2025-11-11',
        } as Partial<OfficialVisitJourney>,
      })

      await request(app).post(URL).set('Referer', URL).send({ visitSlot: '1' }).expect(302).expect('location', URL)

      expect(officialVisitsService.checkForNonAssociationVisits).toHaveBeenCalled()
    })

    it('should warn once per non-associate visit when there is more than one', async () => {
      officialVisitsService.checkForNonAssociationVisits.mockResolvedValue([
        nonAssociateVisit,
        { ...nonAssociateVisit, officialVisitId: 2, prisonerNumber: 'A1233EE', lastName: 'JONES' },
      ])

      await request(app).post(URL).set('Referer', URL).send({ visitSlot: '1' }).expect(302).expect('location', URL)

      const flashed = JSON.parse(flashProvider.mock.calls.find(([key]) => key === 'nonAssociationVisits')[1] as string)
      expect(flashed).toHaveLength(2)
      expect(flashed.map((visit: { lastName: string }) => visit.lastName)).toEqual(['CLARKE', 'JONES'])
    })

    it('should warn and not update the visit in amend mode', async () => {
      officialVisitsService.checkForNonAssociationVisits.mockResolvedValue([nonAssociateVisit])
      const amendUrl = `/manage/amend/1/${UUID}/time-slot`

      await request(app)
        .post(amendUrl)
        .set('Referer', amendUrl)
        .send({ visitSlot: '1' })
        .expect(302)
        .expect('location', amendUrl)

      expect(officialVisitsService.updateVisitTypeAndSlot).not.toHaveBeenCalled()
    })
  })

  describe('GET (non-association warning)', () => {
    const nonAssociateVisit = {
      prisonCode: 'MDI',
      officialVisitId: 23232323,
      visitDate: '2026-05-02',
      startTime: '10:00',
      endTime: '11:00',
      prisonerNumber: 'A1232DD',
      dpsLocationId: 'loc-9',
      firstName: 'PAUL',
      lastName: 'CLARKE',
      locationDescription: 'Room 2',
    }

    const flashWarning = (warning: unknown[]) =>
      flashProvider.mockImplementation((key: string) =>
        key === 'nonAssociationVisits' ? [JSON.stringify(warning)] : [],
      )

    it('should render the warning as an amber alert with the non-associate details', async () => {
      flashWarning([nonAssociateVisit])

      const response = await request(app).get(URL).expect(200)
      const $ = cheerio.load(response.text)
      const alert = $('.moj-alert')

      expect(alert.hasClass('moj-alert--warning')).toBe(true)
      expect(alert.text()).toContain('The prisoner has a non-association')
      expect(alert.text()).toContain('John Smith has a non-association with')
      expect(alert.text()).toContain('Paul Clarke who has a visit booked on 2 May 2026 10:00 to 11:00 in Room 2.')
      expect(alert.text()).toContain('Please review the non-association before completing the booking')
    })

    it('should pluralise the warning when more than one non-associate has a visit booked', async () => {
      flashWarning([
        nonAssociateVisit,
        { ...nonAssociateVisit, officialVisitId: 2, prisonerNumber: 'A1233EE', firstName: 'DAVE', lastName: 'JONES' },
      ])

      const response = await request(app).get(URL).expect(200)
      const alert = cheerio.load(response.text)('.moj-alert')

      expect(alert.text()).toContain('The prisoner has non-associations')
      expect(alert.text()).toContain('John Smith has non-associations with')
      expect(alert.text()).toContain('Paul Clarke who has a visit booked')
      expect(alert.text()).toContain('Dave Jones who has a visit booked')
      expect(alert.text()).toContain('Please review the non-associations before completing the booking')
    })

    it('should keep the singular wording when the same non-associate has more than one visit booked', async () => {
      flashWarning([
        nonAssociateVisit,
        { ...nonAssociateVisit, officialVisitId: 2, startTime: '14:00', endTime: '15:00' },
      ])

      const response = await request(app).get(URL).expect(200)
      const alert = cheerio.load(response.text)('.moj-alert')

      expect(alert.text()).toContain('The prisoner has a non-association')
      expect(alert.text()).toContain('John Smith has a non-association with')
      expect(alert.text()).toContain('10:00 to 11:00')
      expect(alert.text()).toContain('14:00 to 15:00')
    })

    it('should not render the warning when there is nothing flashed', async () => {
      flashProvider.mockReturnValue([])

      const response = await request(app).get(URL).expect(200)

      expect(cheerio.load(response.text)('.moj-alert--warning')).toHaveLength(0)
    })
  })
})
