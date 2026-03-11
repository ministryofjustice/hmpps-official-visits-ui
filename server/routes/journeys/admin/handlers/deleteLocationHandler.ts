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
    const visitSlotId = Number(req.params.visitSlotId)
    const timeSlotId = Number(req.params.timeSlotId)
    const visitSlot = await this.officialVisitsService.getVisitSlot(visitSlotId, user)
    await this.isAllowedToDelete(visitSlot)

    res.render('pages/admin/deleteLocation', {
      visitSlot,
      timeSlotId,
      backTo: `/admin/locations/time-slot/${timeSlotId}/location`,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { user, digitalPrisonServicesUrl } = res.locals
    const visitSlotId = Number(req.params.visitSlotId)
    const timeSlotId = Number(req.params.timeSlotId)
    const visitSlot = await this.officialVisitsService.getVisitSlot(visitSlotId, user)
    await this.isAllowedToDelete(visitSlot)

    await this.officialVisitsService.deleteVisitSlot(visitSlotId, user)

    const backTo = `/admin/locations/time-slot/${timeSlotId}/location`
    const header = 'Location deleted'
    const message = `You have deleted the location from your prisons visiting schedule. <a href="${digitalPrisonServicesUrl}">Return to DPS home page</a>`
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
