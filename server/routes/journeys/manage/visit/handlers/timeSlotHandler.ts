import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'

export default class TimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.CHOOSE_TIME_SLOT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const dayCode = (req.query['dayCode'] as string) || 'MON'
    const timeSlots = await this.officialVisitsService.getAvailableSlots(
      res,
      'MDI',
      new Date().toISOString().substring(0, 10),
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().substring(0, 10),
    )
    req.session.journey.officialVisit.availableSlots = timeSlots

    const schedule = await this.officialVisitsService.getSchedule(res, 'MDI', new Date().toISOString().substring(0, 10))

    res.render('pages/manage/chooseTimeSlot', {
      schedule,
      slots: timeSlots.filter(o => o.dayCode === dayCode),
      selectedTimeSlot:
        res.locals.formResponses?.['timeSlot'] ||
        `${req.session.journey.officialVisit?.selectedTimeSlot?.visitSlotId}-${req.session.journey.officialVisit?.selectedTimeSlot?.timeSlotId}`,
      backUrl: `visit-type`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const [visitSlotId, timeSlotId] = req.body.timeSlot.split('-')
    const foundSlot = req.session.journey.officialVisit.availableSlots.find(
      o => o.timeSlotId === Number(timeSlotId) && o.visitSlotId === Number(visitSlotId),
    )

    // Should only fail if user is manually POSTing - UI should always have this data
    if (foundSlot) {
      req.session.journey.officialVisit.selectedTimeSlot = foundSlot
    }

    return res.redirect(`select-official-visitors`)
  }
}
