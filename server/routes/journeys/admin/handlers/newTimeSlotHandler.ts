import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { CreateTimeSlotRequest } from '../../../../@types/officialVisitsApi/types'
import { schema } from './timeSlotSchema'
import { getTime } from '../../../../utils/utils'

export default class NewTimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_NEW_TIME_SLOT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    const { day } = req.query
    const dayCode = (day || '').toString()

    // Translate day code to readable label using existing partial if needed in template
    res.render('pages/admin/newTimeSlot', {
      dayCode,
      dayLabel: dayCode, // template will use a helper to translate if necessary
      backUrl: '/admin/days',
    })
  }

  public POST = async (req: Request, res: Response) => {
    const {
      startDate,
      expiryDate,
      'startTime-startHour': startHour,
      'startTime-startMinute': startMinute,
      'endTime-endHour': endHour,
      'endTime-endMinute': endMinute,
      dayCode,
    } = (req.body ?? {}) as Record<string, unknown>

    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId

    await this.officialVisitsService.createTimeSlot(
      {
        prisonCode,
        effectiveDate: startDate,
        expiryDate,
        startTime: getTime(startHour, startMinute),
        endTime: getTime(endHour, endMinute),
        dayCode,
      } as CreateTimeSlotRequest,
      user,
    )

    return res.redirect('/admin/days')
  }
}
