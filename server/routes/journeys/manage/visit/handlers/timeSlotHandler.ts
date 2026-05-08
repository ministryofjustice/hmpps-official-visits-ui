import { NextFunction, Request, Response } from 'express'
import { endOfMonth, addMonths, format, startOfMonth, isBefore, startOfToday } from 'date-fns'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { saveTimeSlot, filterAvailableSlots, cyaGuard } from '../createJourneyState'
import ActivitiesService from '../../../../../services/activitiesService'
import {
  getParsedDateFromQueryString,
  getWeekOfDatesStartingMonday,
  buildCalendarMonths,
} from '../../../../../utils/utils'
import { schema } from './timeSlotSchema'
import { getBackLink } from './utils'
import config from '../../../../../config'

export default class TimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.TIME_SLOT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  BODY = schema

  public GET = async (req: Request, res: Response, _next?: NextFunction) => {
    const { date = '' } = req.query
    const selectedDate = getParsedDateFromQueryString(date.toString(), new Date())
    const { user } = res.locals
    const { officialVisit } = req.session.journey
    const { prisonCode, prisonerNumber } = officialVisit.prisoner

    let availableSlots: Awaited<ReturnType<OfficialVisitsService['getAvailableSlots']>>
    let filteredSlots: ReturnType<typeof filterAvailableSlots>
    let calendarData: ReturnType<typeof buildCalendarMonths> | undefined
    let weekOfDates: { date: string; isInFuture: boolean }[] | undefined
    let previousWeek: string | undefined
    let nextWeek: string | undefined

    if (config.featureToggles.twoMonthCalendarEnabled) {
      const selectedMonthStart = startOfMonth(new Date(selectedDate))
      const today = startOfToday()
      const calendarStartDate = isBefore(selectedMonthStart, today) ? today : selectedMonthStart
      const calendarEndDate = endOfMonth(addMonths(calendarStartDate, 1))

      availableSlots = await this.officialVisitsService.getAvailableSlots(
        res,
        prisonCode,
        format(calendarStartDate, 'yyyy-MM-dd'),
        format(calendarEndDate, 'yyyy-MM-dd'),
        officialVisit.visitType === 'VIDEO',
        officialVisit.officialVisitId,
      )

      const selectedDateSlots = availableSlots.filter(slot => slot.visitDate === selectedDate)
      filteredSlots = filterAvailableSlots(selectedDateSlots, officialVisit.visitType, 1)

      const availableDates = [...new Set(availableSlots.map(slot => slot.visitDate))]
      calendarData = buildCalendarMonths(new Date(selectedDate), availableDates)
    } else {
      const weekDates = getWeekOfDatesStartingMonday(selectedDate)
      weekOfDates = weekDates.weekOfDates
      previousWeek = weekDates.previousWeek
      nextWeek = weekDates.nextWeek

      availableSlots = await this.officialVisitsService.getAvailableSlots(
        res,
        prisonCode,
        selectedDate,
        selectedDate,
        officialVisit.visitType === 'VIDEO',
        officialVisit.officialVisitId,
      )

      filteredSlots = filterAvailableSlots(availableSlots, officialVisit.visitType, 1)
    }

    req.session.journey.officialVisit.availableSlots = filteredSlots

    const prisonerSchedule = await this.activitiesService.getPrisonersSchedule(
      prisonCode,
      selectedDate,
      prisonerNumber,
      user,
    )

    const rawErrors = req.flash('alertErrors')[0]
    const errors = rawErrors ? JSON.parse(rawErrors) : {}

    res.render('pages/manage/timeSlot', {
      today: new Date().toISOString().substring(0, 10),
      selectedDate,
      calendarData,
      weekOfDates,
      previousWeek,
      nextWeek,
      prisonerSchedule,
      slots: filteredSlots,
      selectedTimeSlot: res.locals.formResponses?.['timeSlot'] || officialVisit?.selectedTimeSlot?.visitSlotId,
      backUrl: getBackLink(req, res, `visit-type`),
      prisoner: req.session.journey.officialVisit.prisoner,
      checks: errors,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const visit = req.session.journey.officialVisit
    const selectedSlot = req.session.journey.officialVisit.availableSlots.find(
      slot => slot.visitSlotId === req.body.visitSlotId,
    )

    req.session.journey.officialVisit.selectedTimeSlot = selectedSlot

    const errors = await cyaGuard(req, res, this.officialVisitsService)

    if (Object.keys(errors).length > 0) {
      return res.alertValidationError(errors)
    }
    const ovId = req.params.ovId as string
    const journeyId = req.params.journeyId as string
    if (res.locals.mode === 'amend') {
      await this.officialVisitsService.updateVisitTypeAndSlot(
        visit.prisonCode,
        ovId,
        {
          prisonVisitSlotId: selectedSlot.visitSlotId,
          visitDate: selectedSlot.visitDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          dpsLocationId: selectedSlot.dpsLocationId,
          visitTypeCode: visit.visitType,
        },
        res.locals.user,
      )
      req.flash('updateVerb', 'amended')
      return res.redirect(`/manage/amend/${ovId}/${journeyId}`)
    }

    saveTimeSlot(req.session.journey, selectedSlot)
    return res.redirect(`select-official-visitors`)
  }
}
