import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { schema } from './editLocationSchema'

export default class EditLocationHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_EDIT_LOCATION_PAGE

  public BODY = schema

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId
    const timeSlotId = Number(req.params.timeSlotId)
    const visitSlotId = Number(req.params.visitSlotId)

    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)

    // Get this specific time slot
    const matchingTimeSlot = allSlots.timeSlots.filter(slot => slot.timeSlot.prisonTimeSlotId === timeSlotId)
    const timeSlot = matchingTimeSlot[0]

    // Get this specific visit slot
    const matchingVisitSlot = timeSlot.visitSlots.filter(slot => slot.visitSlotId === visitSlotId)
    const visitSlot = matchingVisitSlot[0]

    // TODO : get the visit slot(location) by id directly from the API instead of filtering through all the time slots and visit slots

    res.render('pages/admin/editLocation', {
      timeSlot: timeSlot.timeSlot,
      visitSlot,
      backUrl: `/admin/locations/time-slot/${timeSlotId}/location`,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { user, digitalPrisonServicesUrl } = res.locals
    const visitSlotId = Number(req.params.visitSlotId)

    const { dpsLocationId, maxAdults, maxGroups, maxVideo } = req.body as Record<string, unknown>

    const body = {
      dpsLocationId: dpsLocationId as string,
      maxAdults: typeof maxAdults !== 'undefined' ? Number(maxAdults) : undefined,
      maxGroups: typeof maxGroups !== 'undefined' ? Number(maxGroups) : undefined,
      maxVideo: typeof maxVideo !== 'undefined' ? Number(maxVideo) : undefined,
    }

    await this.officialVisitsService.updateVisitSlot(visitSlotId, body, user)

    // Redirect back to the time slot page with a success message
    const backTo = `/admin/locations/time-slot/${req.params.timeSlotId}/location`
    const header = 'Location for visit updated'
    const message = `You have updated the location for visiting time in your prisons schedule. <a href="${digitalPrisonServicesUrl}">Return to DPS home page</a>`
    res.addSuccessMessage(header, message)
    return res.redirect(backTo)
  }
}
