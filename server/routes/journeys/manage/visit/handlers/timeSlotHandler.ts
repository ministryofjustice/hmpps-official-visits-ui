import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { hasPrisonerOverlap, saveTimeSlot, filterAvailableSlots, hasVisitorOverlap } from '../createJourneyState'
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

  public GET = async (req: Request, res: Response) => {
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
    )

    const filteredSlots = filterAvailableSlots(availableSlots, officialVisit.visitType, 1)

    req.session.journey.officialVisit.availableSlots = filteredSlots

    const prisonerSchedule = await this.activitiesService.getPrisonersSchedule(
      prisonCode,
      selectedDate,
      prisonerNumber,
      user,
    )

    const hasOverlap = req.flash('hasOverlap')[0] === 'true'

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
      hasOverlap,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const visit = req.session.journey.officialVisit
    const selectedSlot = req.session.journey.officialVisit.availableSlots.find(
      slot => slot.visitSlotId === req.body.visitSlotId,
    )

    const overlapResult = await this.officialVisitsService.checkForOverlappingVisits(
      visit.prisoner.prisonCode,
      visit.prisoner.prisonerNumber,
      selectedSlot.visitDate,
      selectedSlot.startTime,
      selectedSlot.endTime,
      [...(visit.officialVisitors || []), ...(visit.socialVisitors || [])].map(v => v.contactId),
      visit.officialVisitId || 0,
      res.locals.user,
    )

    if (hasPrisonerOverlap(overlapResult) || hasVisitorOverlap(overlapResult)) {
      req.flash('hasOverlap', 'true')
      return res.redirect(req.get('Referrer') || req.originalUrl)
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

    req.session.journey.officialVisit.selectedTimeSlot = req.body
    saveTimeSlot(req.session.journey, req.body)
    return res.redirect(`select-official-visitors`)
  }
}
