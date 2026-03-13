import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'

export default class DayHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_DAYS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const prisonCode = req.session.activeCaseLoadId
    const { user } = res.locals

    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)

    const monSlots = allSlots.timeSlots
      .filter(slot => slot.timeSlot.dayCode === 'MON')
      .sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime))
    const tueSlots = allSlots.timeSlots
      .filter(slot => slot.timeSlot.dayCode === 'TUE')
      .sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime))
    const wedSlots = allSlots.timeSlots
      .filter(slot => slot.timeSlot.dayCode === 'WED')
      .sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime))
    const thuSlots = allSlots.timeSlots
      .filter(slot => slot.timeSlot.dayCode === 'THU')
      .sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime))
    const friSlots = allSlots.timeSlots
      .filter(slot => slot.timeSlot.dayCode === 'FRI')
      .sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime))
    const satSlots = allSlots.timeSlots
      .filter(slot => slot.timeSlot.dayCode === 'SAT')
      .sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime))
    const sunSlots = allSlots.timeSlots
      .filter(slot => slot.timeSlot.dayCode === 'SUN')
      .sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime))

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
