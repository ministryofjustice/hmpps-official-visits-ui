import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'

export default class TimeSlotsHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_DAYS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const prisonCode = req.session.activeCaseLoadId
    const { user } = res.locals

    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)

    // Group and sort time slots by day
    const daySlots = allSlots.timeSlots.reduce(
      (acc, slot) => {
        const { dayCode } = slot.timeSlot
        if (!acc[dayCode]) {
          acc[dayCode] = []
        }
        acc[dayCode].push(slot)
        return acc
      },
      { MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [], SUN: [] } as Record<string, typeof allSlots.timeSlots>,
    )

    // Sort each day's slots by start time, then by end time for tie-breakers
    Object.keys(daySlots).forEach(dayCode => {
      daySlots[dayCode].sort((a, b) => {
        const startTimeCompare = a.timeSlot.startTime.localeCompare(b.timeSlot.startTime)
        if (startTimeCompare !== 0) {
          return startTimeCompare
        }
        return a.timeSlot.endTime.localeCompare(b.timeSlot.endTime)
      })
    })

    const {
      MON: monSlots,
      TUE: tueSlots,
      WED: wedSlots,
      THU: thuSlots,
      FRI: friSlots,
      SAT: satSlots,
      SUN: sunSlots,
    } = daySlots

    res.render('pages/admin/timeSlots', {
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
