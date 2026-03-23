import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { CreateVisitSlotRequest } from '../../../../@types/officialVisitsApi/types'
import { schema } from './newLocationSchema'

export default class NewLocationHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_ADD_LOCATION_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    const timeSlotId = Number(req.params.timeSlotId)
    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId || 'MDI'

    const locations = await this.officialVisitsService.getOfficialVisitLocationsAtPrison(prisonCode, user)
    const timeSlot = await this.officialVisitsService.getPrisonTimeSlotById(timeSlotId, user)

    res.render('pages/admin/newLocation', {
      timeSlot,
      locations,
      backUrl: `/admin/locations/time-slot/${timeSlotId}/location`,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const timeSlotId = Number(req.params.timeSlotId)
    const { user, digitalPrisonServicesUrl } = res.locals
    const { dpsLocationId, maxAdults, maxGroups, maxVideo } = req.body as Record<string, unknown>

    const body = {
      dpsLocationId: dpsLocationId as string,
      maxAdults: typeof maxAdults !== 'undefined' ? Number(maxAdults) : undefined,
      maxGroups: typeof maxGroups !== 'undefined' ? Number(maxGroups) : undefined,
      maxVideo: typeof maxVideo !== 'undefined' ? Number(maxVideo) : undefined,
    } as CreateVisitSlotRequest

    await this.officialVisitsService.createVisitSlot(timeSlotId, body, user)
    const header = 'New location for visit created'
    const message = `You have created a new location for visiting time in your prison's schedule. <a href="${digitalPrisonServicesUrl}">Return to DPS home page</a>`
    res.addSuccessMessage(header, message)

    return res.redirect(`/admin/locations/time-slot/${timeSlotId}/location`)
  }
}
