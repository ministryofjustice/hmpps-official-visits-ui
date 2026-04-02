import { NextFunction, Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { saveTimeSlot, filterAvailableSlots, cyaGuard } from '../createJourneyState'
import ActivitiesService from '../../../../../services/activitiesService'
import { getParsedDateFromQueryString, getWeekOfDatesStartingMonday } from '../../../../../utils/utils'
import { schema } from './timeSlotSchema'
import { getBackLink } from './utils'

export default class TimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.TIME_SLOT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  BODY = schema

  public GET = async (req: Request, res: Response, _next?: NextFunction, errors: Record<string, boolean> = {}) => {
    const { date = '' } = req.query
    const selectedDate = getParsedDateFromQueryString(date.toString(), new Date())
    const { weekOfDates, previousWeek, nextWeek } = getWeekOfDatesStartingMonday(selectedDate)
    const { user } = res.locals
    const { officialVisit } = req.session.journey
    const { prisonCode, prisonerNumber } = officialVisit.prisoner

    const availableSlots = await this.officialVisitsService.getAvailableSlots(
      res,
      prisonCode,
      selectedDate,
      selectedDate,
      officialVisit.visitType === 'VIDEO',
      officialVisit.officialVisitId,
    )

    const filteredSlots = filterAvailableSlots(availableSlots, officialVisit.visitType, 1)

    req.session.journey.officialVisit.availableSlots = filteredSlots

    const prisonerSchedule = await this.activitiesService.getPrisonersSchedule(
      prisonCode,
      selectedDate,
      prisonerNumber,
      user,
    )

    res.render('pages/manage/timeSlot', {
      today: new Date().toISOString().substring(0, 10),
      selectedDate,
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
      return this.GET(req, res, undefined, errors)
    }

    if (res.locals.mode === 'amend') {
      await this.officialVisitsService.updateVisitTypeAndSlot(
        visit.prisonCode,
        req.params.ovId,
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
      return res.redirect(`/manage/amend/${req.params.ovId}/${req.params.journeyId}`)
    }

    saveTimeSlot(req.session.journey, selectedSlot)
    return res.redirect(`select-official-visitors`)
  }
}
