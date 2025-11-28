import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import ActivitiesService from '../../../../../services/activitiesService'
import { getPageHeader, getTextById } from '../../../../testutils/cheerio'
import { getJourneySession } from '../../../../testutils/testUtilRoute'
import { mockTimeslots, mockScheduleEvents, prisoner } from '../../../../../testutils/mocks'
import { expectErrorMessages, expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
import { Journey } from '../../../../../@types/express'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')
jest.mock('../../../../../services/activitiesService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const activitiesService = new ActivitiesService(null) as jest.Mocked<ActivitiesService>

let app: Express

const appSetup = (
  journeySession = { officialVisit: { prisoner, availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }] } },
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

  officialVisitsService.getAvailableSlots.mockResolvedValue(mockTimeslots)

  activitiesService.getScheduledEventsByPrisonerNumbers.mockResolvedValue(mockScheduleEvents)
})

afterEach(() => {
  jest.resetAllMocks()
  jest.useRealTimers()
})

const URL = `/manage/create/${journeyId()}/time-slot`

describe('Time slot handler', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)
          const selectedDate = getTextById($, 'selected-date')

          expect(heading).toEqual('Select date and time of official visit')
          expect(selectedDate).toEqual('Thursday 25 December 2025')

          // Not clickable dates (in the past or today)
          expect($('.bapv-timetable-dates__date > span:nth-child(2)').eq(0).text()).toEqual('22')
          expect($('.bapv-timetable-dates__date > span:nth-child(2)').eq(1).text()).toEqual('23')
          expect($('.bapv-timetable-dates__date > span:nth-child(2)').eq(2).text()).toEqual('24')
          expect($('.bapv-timetable-dates__date > span:nth-child(2)').eq(3).text()).toEqual('25')
          // Clickable dates (in the future)
          expect($('.bapv-timetable-dates__date > a > span:nth-child(1)').eq(0).text()).toEqual('26')
          expect($('.bapv-timetable-dates__date > a > span:nth-child(1)').eq(1).text()).toEqual('27')
          expect($('.bapv-timetable-dates__date > a > span:nth-child(1)').eq(2).text()).toEqual('28')

          // Default page shouldn't show previous week because it'll be in the past
          expect($('.moj-pagination__item--prev').children().length).toBeFalsy()
          expect($('.moj-pagination__item--next').children().length).toBeTruthy()

          expect($('caption').text()).toEqual('John Smith’s schedule')

          expect($('.govuk-table__header').eq(0).text()).toEqual('Time')
          expect($('.govuk-table__header').eq(1).text()).toEqual('Event name')
          expect($('.govuk-table__header').eq(2).text()).toEqual('Type')
          expect($('.govuk-table__header').eq(3).text()).toEqual('Location')

          // expect($('.govuk-table__cell').eq(0).text()).toEqual('08:00 to 17:00')
          // expect($('.govuk-table__cell').eq(1).text()).toEqual('ROTL - out of prison')
          // expect($('.govuk-table__cell').eq(2).text()).toEqual('Activity')
          // expect($('.govuk-table__cell').eq(3).text()).toEqual('Out of prison')

          // expect($('.govuk-radios__label').text()).toContain('8am to 5pmRoom 1')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.CHOOSE_TIME_SLOT_PAGE, {
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
        .send({ timeSlot: '' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'timeSlot',
              href: '#timeSlot',
              text: 'Select a date and time for the official visit',
            },
          ]),
        )
    })

    it('should error on an invalid time slot', () => {
      return request(app)
        .post(URL)
        .send({ timeSlot: 'NaN' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'timeSlot',
              href: '#timeSlot',
              text: 'Select a date and time for the official visit',
            },
          ]),
        )
    })

    it('should accept a valid time slot', async () => {
      await request(app)
        .post(URL)
        .send({ timeSlot: '1-1' })
        .expect(302)
        .expect('location', 'select-official-visitors')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.selectedTimeSlot).toEqual({ timeSlotId: 1, visitSlotId: 1 })
    })
  })
})
