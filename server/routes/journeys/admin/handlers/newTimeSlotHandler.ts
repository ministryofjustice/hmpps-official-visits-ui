import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { CreateTimeSlotRequest, TimeSlotSummary } from '../../../../@types/officialVisitsApi/types'
import { schema } from './timeSlotSchema'
import { getTime, translateDay } from '../../../../utils/utils'
import { dateRangeOverlap } from '../../../../utils/dateRangeOverlap'

export default class NewTimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_NEW_TIME_SLOT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    const { day } = req.query
    const dayCode = (day || '').toString()

    const returnUrlSuffix = translateDay(dayCode).trim().toLowerCase()
    res.render('pages/admin/newTimeSlot', {
      dayCode,
      dayLabel: dayCode,
      backUrl: `/admin/days#${returnUrlSuffix}`,
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

    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)
    const newStartTime = getTime(startHour, startMinute)
    const newEndTime = getTime(endHour, endMinute)
    // Check for duplicate/overlapping time slots at this prison (same dayCode, startTime and endTime, effective date, start date)
    const duplicateOverlap = this.getDuplicateOverlap(
      allSlots,
      dayCode as string,
      newStartTime,
      newEndTime,
      startDate as string,
      expiryDate as string,
    )

    if (duplicateOverlap) {
      res.addValidationError(
        'A time slot with the same day and time already exists for the provided date range',
        'startTime',
      )
      return res.validationFailed()
    }

    const timeSlot = await this.officialVisitsService.createTimeSlot(
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

    if (!timeSlot) {
      throw new Error('createTimeSlot returned null or undefined')
    }

    const returnUrlSuffix = translateDay(timeSlot.dayCode).trim().toLowerCase()
    const header = 'New time for visit created'
    const message =
      'You have created a new visiting time in your prisons schedule. To add locations and capacities for this visit select manage locations.'
    res.addSuccessMessage(header, message)
    return res.redirect(`/admin/days#${returnUrlSuffix}`)
  }

  private getDuplicateOverlap(
    allSlots: TimeSlotSummary,
    dayCode: string,
    newStartTime: string,
    newEndTime: string,
    startDate: string,
    expiryDate: string,
  ) {
    return (allSlots?.timeSlots || []).some(slot => {
      const ts = slot.timeSlot
      // If dayCode, startTime or endTime are different, no possibility of duplicate/overlap -> skip
      if (ts.dayCode !== (dayCode as string) || ts.startTime !== newStartTime || ts.endTime !== newEndTime) return false
      // If dayCode, startTime and endTime are the same, check for effective/expiry date overlap to determine if this is a duplicate/overlap
      return dateRangeOverlap(
        ts.effectiveDate as string,
        ts.expiryDate as string,
        startDate as string,
        expiryDate as string,
      )
    })
  }
}
