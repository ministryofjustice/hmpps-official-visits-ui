import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { translateDay } from '../../../../utils/utils'

export default class LocationHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_LOCATIONS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const timeSlotId = Number(req.params.timeSlotId)
    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId || 'MDI'

    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)
    const matchingTimeSlot = allSlots?.timeSlots?.filter(slot => slot.timeSlot.prisonTimeSlotId === timeSlotId)
    // todo : worth adding api to get the time slot by id instead of filtering here?
    const location = matchingTimeSlot?.[0]

    const timeSlot = location?.timeSlot
    const returnUrlSuffix = translateDay(timeSlot?.dayCode).trim().toLowerCase()
    res.render('pages/admin/locations', {
      timeSlot,
      visitSlots: location?.visitSlots,
      backUrl: `/admin/days#${returnUrlSuffix}`,
    })
  }
}
