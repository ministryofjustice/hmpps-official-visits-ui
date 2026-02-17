import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import TelemetryService from '../../../../services/telemetryService'

export default class LocationHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_LOCATIONS_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const timeSlotId = Number(req.params.timeSlotId)
    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId || 'MDI'

    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)
    const matchingTimeSlot = allSlots.timeSlots.filter(slot => slot.timeSlot.prisonTimeSlotId === timeSlotId)

    // TODO: Check here that we have exactly one time slot - maybe someone else removed it?
    const timeSlot = matchingTimeSlot[0]

    this.telemetryService.trackEvent('OFFICIAL_VISIT_ADMIN_VIEW_LOCATION', user, {
      timeSlotId,
      prisonCode,
    })
    res.render('pages/admin/locations', {
      timeSlot: timeSlot.timeSlot,
      visitSlots: timeSlot.visitSlots,
    })
  }
}
