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

    const summaryItem = await this.officialVisitsService.getPrisonTimeSlotSummaryById(timeSlotId, user)
    const timeSlot = summaryItem?.timeSlot
    const returnUrlSuffix = translateDay(timeSlot?.dayCode).trim().toLowerCase()
    res.render('pages/admin/locations', {
      timeSlot,
      visitSlots: summaryItem?.visitSlots,
      backUrl: `/admin/time-slots#${returnUrlSuffix}`,
    })
  }
}
