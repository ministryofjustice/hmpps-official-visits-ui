// import type { Express } from 'express'
// import request from 'supertest'
// import * as cheerio from 'cheerio'
// import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
// import AuditService, { Page } from '../../../../../services/auditService'
// import PrisonerService from '../../../../../services/prisonerService'
// import OfficialVisitsService from '../../../../../services/officialVisitsService'
// import { getPageHeader, getTextById } from '../../../../testutils/cheerio'
// import { expectErrorMessages, expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
// import expectJourneySession from '../../../../testutils/testUtilRoute'

// jest.mock('../../../../../services/auditService')
// jest.mock('../../../../../services/prisonerService')
// jest.mock('../../../../../services/officialVisitsService')

// const auditService = new AuditService(null) as jest.Mocked<AuditService>
// const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
// const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

// let app: Express

// const appSetup = (journeySession = { officialVisit: {} }) => {
//   app = appWithAllRoutes({
//     services: { auditService, prisonerService, officialVisitsService },
//     userSupplier: () => user,
//     journeySessionSupplier: () => journeySession,
//   })
// }

// beforeEach(() => {
//   appSetup()
//   jest.useFakeTimers()
//   jest.setSystemTime(new Date("2025-12-25"))
//   officialVisitsService.getAvailableSlots.mockResolvedValue([{ timeSlotId: 1, visitSlotId: 1, visitDate: '2025-12-25' } as any])
//   officialVisitsService.getSchedule.mockResolvedValue([])
// })

// afterEach(() => {
//   jest.resetAllMocks()
//   jest.useRealTimers()
// })

// const URL = `/manage/create/${journeyId()}/time-slot`

// describe('Time slot handler', () => {
//   describe('GET', () => {
//     it('should render the correct view page', () => {
//       return request(app)
//         .get(URL)
//         .expect('Content-Type', /html/)
//         .expect(res => {
//           const $ = cheerio.load(res.text)
//           const heading = getPageHeader($)
//           const selectedDate = getTextById($, 'selected-date')

//           expect(heading).toEqual('Select date and time of official visit')
//           expect(selectedDate).toEqual("Thursday 25 December 2025")

//           expect(getTextById($, 'day-0')).toEqual('22')
//           expect(getTextById($, 'day-1')).toEqual('23')
//           expect(getTextById($, 'day-2')).toEqual('24')
//           expect(getTextById($, 'day-3')).toEqual('25')
//           expect(getTextById($, 'day-4')).toEqual('26')
//           expect(getTextById($, 'day-5')).toEqual('27')
//           expect(getTextById($, 'day-6')).toEqual('28')

//           expect($('.bapv-timetable-dates__date--selected').text()).toEqual('Thu 25')

//           expect(auditService.logPageView).toHaveBeenCalledWith(Page.VISIT_TYPE_PAGE, {
//             who: user.username,
//             correlationId: expect.any(String),
//           })
//         })
//     })
//   })

//   describe('POST', () => {
//     it('should error on an empty submission', () => {
//       return request(app)
//         .post(URL)
//         .send({ timeSlot: '' })
//         .expect(() =>
//           expectErrorMessages([
//             {
//               fieldId: 'timeSlot',
//               href: '#timeSlot',
//               text: 'Select a date and time for the official visit',
//             },
//           ]),
//         )
//     })

//     it('should error on an invalid official visit type', () => {
//       return request(app)
//         .post(URL)
//         .send({ timeSlot: 'NaN' })
//         .expect(() =>
//           expectErrorMessages([
//             {
//               fieldId: 'timeSlot',
//               href: '#timeSlot',
//               text: 'Select a date and time for the official visit',
//             },
//           ]),
//         )
//     })

//     it('should accept a valid official visit type', () => {
//       return request(app)
//         .post(URL)
//         .send({ timeSlot: 'PHONE' })
//         .expect(302)
//         .expect('location', 'time-slot')
//         .expect(() => expectNoErrorMessages())
//         .then(() =>
//           expectJourneySession(app, 'officialVisit', {
//             selectedTimeSlot: {}
//           }),
//         )
//     })
//   })
// })
