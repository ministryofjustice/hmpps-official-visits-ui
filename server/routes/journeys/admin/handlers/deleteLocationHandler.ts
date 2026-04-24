import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { VisitSlot } from '../../../../@types/officialVisitsApi/types'

export default class DeleteLocationHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_DELETE_LOCATION_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const locationId = Number(req.params.locationId)
    const timeSlotId = Number(req.params.timeSlotId)
    const visitSlot = await this.officialVisitsService.getVisitSlot(locationId, user)
    await this.isAllowedToDelete(visitSlot)

    res.render('pages/admin/deleteLocation', {
      visitSlot,
      timeSlotId,
      backUrl: `/admin/time-slot/${timeSlotId}/location`,
    })
  }

  // Disabled POST route to prevent deleting through manual request
  public POST_disabled = async (req: Request, res: Response) => {
    const { user, digitalPrisonServicesUrl } = res.locals
    const locationId = Number(req.params.locationId)
    const timeSlotId = Number(req.params.timeSlotId)
    const visitSlot = await this.officialVisitsService.getVisitSlot(locationId, user)
    await this.isAllowedToDelete(visitSlot)

    await this.officialVisitsService.deleteVisitSlot(locationId, user)

    const backTo = `/admin/time-slot/${timeSlotId}/location`
    const header = 'Location for visit deleted'
    const message = `You have deleted a location for a visiting time in your prison's schedule. <a href="${digitalPrisonServicesUrl}">Return to DPS home page</a>`
    res.addSuccessMessage(header, message)
    return res.redirect(backTo)
  }

  private async isAllowedToDelete(visitSlot: VisitSlot) {
    if (visitSlot.hasVisit) {
      throw new Error(
        'There are visits booked for this location, so it cannot be deleted. Please cancel the visits before deleting the location.',
      )
    }
  }
}
