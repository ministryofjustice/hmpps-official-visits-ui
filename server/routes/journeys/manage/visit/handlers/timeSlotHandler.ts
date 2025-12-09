import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import ActivitiesService from '../../../../../services/activitiesService'
import { getParsedDateFromQueryString, getWeekOfDatesStartingMonday } from '../../../../../utils/utils'
import { schema } from './timeSlotSchema'
import { saveTimeSlot } from '../createJourneyGuard'

export default class TimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.TIME_SLOT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    const { date = '' } = req.query
    const selectedDate = getParsedDateFromQueryString(date.toString(), new Date())
    const { weekOfDates, previousWeek, nextWeek } = getWeekOfDatesStartingMonday(selectedDate)
    const { user } = res.locals
    const { officialVisit } = req.session.journey
    const { prisonCode, prisonerNumber } = officialVisit.prisoner

    // Get the available slots with some capacity on the date selected
    const availableSlots = await this.officialVisitsService.getAvailableSlots(
      res,
      prisonCode,
      selectedDate,
      selectedDate,
    )

    req.session.journey.officialVisit.availableSlots = availableSlots

    // Get the prisoner's schedule on the date selected
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
      slots: availableSlots,
      selectedTimeSlot:
        res.locals.formResponses?.['timeSlot'] ||
        `${officialVisit?.selectedTimeSlot?.visitSlotId}-${officialVisit?.selectedTimeSlot?.timeSlotId}`,
      backUrl: `visit-type`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    req.session.journey.officialVisit.selectedTimeSlot = req.body
    saveTimeSlot(req.session.journey, req.body)
    return res.redirect(`select-official-visitors`)
  }
}
