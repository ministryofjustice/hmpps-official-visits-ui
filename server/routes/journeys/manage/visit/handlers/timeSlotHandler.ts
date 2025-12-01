import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import ActivitiesService from '../../../../../services/activitiesService'
import { getParsedDateFromQueryString, getWeekOfDatesStartingMonday } from '../../../../../utils/utils'
import { schema } from './timeSlotSchema'

export default class TimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.CHOOSE_TIME_SLOT_PAGE

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
    const timeSlots = await this.officialVisitsService.getAvailableSlots(res, prisonCode, selectedDate, selectedDate)
    officialVisit.availableSlots = timeSlots
    const schedule = await this.activitiesService.getPrisonersSchedule(
      prisonCode,
      selectedDate,
      Array.of(prisonerNumber),
      user,
    )

    res.render('pages/manage/timeSlot', {
      today: new Date().toISOString().substring(0, 10),
      selectedDate,
      weekOfDates,
      previousWeek,
      nextWeek,
      schedule,
      slots: timeSlots.filter(o => o.visitDate === selectedDate),
      selectedTimeSlot:
        res.locals.formResponses?.['timeSlot'] ||
        `${officialVisit?.selectedTimeSlot?.visitSlotId}-${officialVisit?.selectedTimeSlot?.timeSlotId}`,
      backUrl: `visit-type`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    req.session.journey.officialVisit.selectedTimeSlot = req.body
    return res.redirect(`select-official-visitors`)
  }
}
