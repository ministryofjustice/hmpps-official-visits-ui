import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import TelemetryService from '../../../../services/telemetryService'

export default class VisitSlotHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_VISIT_SLOT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId
    const timeSlotId = Number(req.params.timeSlotId)
    const visitSlotId = Number(req.params.visitSlotId)

    // Get all the active time slots for the prison
    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)

    // Get this specific time slot
    const matchingTimeSlot = allSlots.timeSlots.filter(slot => slot.timeSlot.prisonTimeSlotId === timeSlotId)
    const timeSlot = matchingTimeSlot[0]

    // Get this specific visit slot
    const matchingVisitSlot = timeSlot.visitSlots.filter(slot => slot.visitSlotId === visitSlotId)
    const visitSlot = matchingVisitSlot[0]

    this.telemetryService.trackEvent('OFFICIAL_VISIT_ADMIN_VIEW_VISIT_SLOTS', user, {
      timeSlotId,
      visitSlotId,
      prisonCode,
    })
    res.render('pages/admin/visit-slot', {
      timeSlot: timeSlot.timeSlot,
      visitSlot,
    })
  }
}
