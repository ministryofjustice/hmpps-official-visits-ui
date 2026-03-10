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
    const timeSlotId = Number(req.params.timeSlotId)
    const visitSlotId = Number(req.params.visitSlotId)

    const visitSlot = await this.officialVisitsService.getVisitSlot(visitSlotId, user)
    const timeSlot = await this.officialVisitsService.getPrisonTimeSlotById(timeSlotId, user)

    res.render('pages/admin/editLocation', {
      timeSlot,
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
