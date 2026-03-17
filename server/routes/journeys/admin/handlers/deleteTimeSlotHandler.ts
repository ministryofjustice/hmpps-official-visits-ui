import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { TimeSlotSummaryItem } from '../../../../@types/officialVisitsApi/types'

export default class DeleteTimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_DELETE_TIME_SLOT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const timeSlotId = Number(req.params.timeSlotId)

    // Fetch the full timeslot summary from the API so we can check if visitSlots exist
    const summary = await this.officialVisitsService.getPrisonTimeSlotById(timeSlotId, user)

    // The API returns a TimeSlot; for consistency create a small wrapper expected by the template
    const timeSlot: TimeSlotSummaryItem = {
      timeSlot: summary,
      visitSlots: [],
    }

    // The admin days page groups this differently; we render a confirmation page similar to deleteLocation
    res.render('pages/admin/deleteTimeSlot', {
      timeSlot,
      backUrl: '/admin/days',
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { user, digitalPrisonServicesUrl } = res.locals
    const timeSlotId = Number(req.params.timeSlotId)

    // Check for associated visit slots first
    const all = await this.officialVisitsService.getVisitSlotsAtPrison(req.session.activeCaseLoadId, user)
    const found = (all?.timeSlots || []).find(t => t.timeSlot.prisonTimeSlotId === timeSlotId)
    if (found && found.visitSlots && found.visitSlots.length > 0) {
      throw new Error('There are visit slots associated with this time slot - cannot delete')
    }

    await this.officialVisitsService.deleteTimeSlot(timeSlotId, user)

    const backTo = '/admin/days'
    const header = 'Visiting time deleted'
    const message = `You have deleted a visiting time in your prisons schedule. <a href="${digitalPrisonServicesUrl}">Return to DPS home page</a>`
    res.addSuccessMessage(header, message)
    return res.redirect(backTo)
  }
}
