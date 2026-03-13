import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { groupAndSortTimeSlots } from '../../../../utils/utils'
import { TimeSlotSummaryItem } from '../../../../@types/officialVisitsApi/types'

export default class DayHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_DAYS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const prisonCode = req.session.activeCaseLoadId
    const { user } = res.locals

    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)

    // Group and sort slots using shared utility
    const grouped = groupAndSortTimeSlots(allSlots?.timeSlots)

    // Extract each day's pre-sorted slots
    const monSlots: TimeSlotSummaryItem[] = grouped['MON'] || []
    const tueSlots: TimeSlotSummaryItem[] = grouped['TUE'] || []
    const wedSlots: TimeSlotSummaryItem[] = grouped['WED'] || []
    const thuSlots: TimeSlotSummaryItem[] = grouped['THU'] || []
    const friSlots: TimeSlotSummaryItem[] = grouped['FRI'] || []
    const satSlots: TimeSlotSummaryItem[] = grouped['SAT'] || []
    const sunSlots: TimeSlotSummaryItem[] = grouped['SUN'] || []

    // Render the slots across the various days in this prison
    res.render('pages/admin/days', {
      monSlots,
      tueSlots,
      wedSlots,
      thuSlots,
      friSlots,
      satSlots,
      sunSlots,
      backUrl: '/',
    })
  }
}
