import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import TelemetryService from '../../../../services/telemetryService'

export default class DayHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_DAYS_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const prisonCode = req.session.activeCaseLoadId
    const { user } = res.locals

    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)

    const monSlots = allSlots.timeSlots.filter(slot => slot.timeSlot.dayCode === 'MON')
    const tueSlots = allSlots.timeSlots.filter(slot => slot.timeSlot.dayCode === 'TUE')
    const wedSlots = allSlots.timeSlots.filter(slot => slot.timeSlot.dayCode === 'WED')
    const thuSlots = allSlots.timeSlots.filter(slot => slot.timeSlot.dayCode === 'THU')
    const friSlots = allSlots.timeSlots.filter(slot => slot.timeSlot.dayCode === 'FRI')
    const satSlots = allSlots.timeSlots.filter(slot => slot.timeSlot.dayCode === 'SAT')
    const sunSlots = allSlots.timeSlots.filter(slot => slot.timeSlot.dayCode === 'SUN')

    // Render the slots across the various days in this prison
    this.telemetryService.trackEvent('OFFICIAL_VISIT_ADMIN_VIEW_DAYS', user, {
      prisonCode,
    })

    res.render('pages/admin/days', {
      monSlots,
      tueSlots,
      wedSlots,
      thuSlots,
      friSlots,
      satSlots,
      sunSlots,
    })
  }
}
