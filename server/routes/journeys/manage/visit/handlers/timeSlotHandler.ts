import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import ActivitiesService from '../../../../../services/activitiesService'
import { getParsedDateFromQueryString, getWeekOfDatesStartingMonday } from '../../../../../utils/utils'
import { schema } from './timeSlotSchema'
import { saveTimeSlot } from '../createJourneyState'
import { getBackLink } from './utils'

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
      officialVisit.visitType === 'VIDEO',
    )

    // Stored here and used in the schema check on the POST
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
      selectedTimeSlot: res.locals.formResponses?.['timeSlot'] || officialVisit?.selectedTimeSlot?.visitSlotId,
      backUrl: getBackLink(req, res, `visit-type`),
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    if (res.locals.mode === 'amend') {
      try {
        const selectedSlot = req.session.journey.officialVisit.availableSlots.find(
          slot => slot.visitSlotId === req.body.visitSlotId,
        )

        if (selectedSlot) {
          await this.officialVisitsService.updateVisitTypeAndSlot(
            req.session.journey.officialVisit.prisonCode,
            req.params.ovId,
            {
              prisonVisitSlotId: selectedSlot.visitSlotId,
              visitDate: selectedSlot.visitDate,
              startTime: selectedSlot.startTime,
              endTime: selectedSlot.endTime,
              dpsLocationId: selectedSlot.dpsLocationId,
              visitTypeCode: req.session.journey.officialVisit.visitType,
            },
            res.locals.user,
          )
          req.flash('updateVerb', 'amended')
        }
      } catch (error) {
        req.flash('errors', 'Failed to update visit time slot. Please try again.')
      }
      return res.redirect(`/manage/amend/${req.params.ovId}/${req.params.journeyId}`)
    }

    req.session.journey.officialVisit.selectedTimeSlot = req.body
    saveTimeSlot(req.session.journey, req.body)
    return res.redirect(`select-official-visitors`)
  }
}
