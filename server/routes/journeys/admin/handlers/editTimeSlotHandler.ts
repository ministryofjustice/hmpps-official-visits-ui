import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { CreateTimeSlotRequest, TimeSlot, TimeSlotSummary } from '../../../../@types/officialVisitsApi/types'
import { schema } from './timeSlotSchema'
import { getTime, translateDay } from '../../../../utils/utils'
import { dateRangeOverlap } from '../../../../utils/dateRangeOverlap'
import logger from '../../../../../logger'

export default class EditTimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.ADMIN_NEW_TIME_SLOT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    const { day } = req.query
    const timeSlotId = Number(req.params.timeSlotId)
    const dayCode = (day || '').toString()

    const editMode = !!timeSlotId
    let existing: TimeSlot = null
    let prefill: Record<string, unknown> | null = null

    const id = Number(timeSlotId)
    const { user } = res.locals
    try {
      existing = await this.officialVisitsService.getPrisonTimeSlotById(id, user)

      if (existing) {
        const startParts = (existing.startTime || '').split(':')
        const endParts = (existing.endTime || '').split(':')
        prefill = {
          startDate: existing.effectiveDate,
          expiryDate: existing.expiryDate,
          'startTime-startHour': startParts[0] || '',
          'startTime-startMinute': startParts[1] || '',
          'endTime-endHour': endParts[0] || '',
          'endTime-endMinute': endParts[1] || '',
          timeSlotId: existing.prisonTimeSlotId,
        }
      }
    } catch (err) {
      logger.error('Error fetching existing time slot', err)
      throw new Error('createTimeSlot returned null or undefined')
    }

    const returnUrlSuffix = translateDay(dayCode).trim().toLowerCase()
    // Translate day code to readable label using existing partial if needed in template
    res.render('pages/admin/newTimeSlot', {
      dayCode,
      dayLabel: dayCode, // template will use a helper to translate if necessary
      backUrl: `/admin/time-slots#${returnUrlSuffix}`,
      editMode,
      existing,
      prefill,
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

    const timeSlotIdParam = Number(req.params.timeSlotId)

    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId

    const payload = {
      prisonCode,
      effectiveDate: startDate,
      expiryDate,
      startTime: getTime(startHour, startMinute),
      endTime: getTime(endHour, endMinute),
      dayCode,
    } as CreateTimeSlotRequest

    const id = Number(timeSlotIdParam)
    logger.info(`Updating time slot ${id}`)
    // Check for duplicate/overlapping time slots at this prison (same dayCode, startTime and endTime, effective date, start date)
    const allSlots = await this.officialVisitsService.getVisitSlotsAtPrison(prisonCode, user)
    const newStartTime = getTime(startHour, startMinute)
    const newEndTime = getTime(endHour, endMinute)

    const duplicateOverlap = this.getDuplicateOverlap(
      allSlots,
      id,
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

    await this.officialVisitsService.updateTimeSlot(id, payload, user)

    res.addSuccessMessage('Time for visit updated', 'You have updated a visiting time in your prisons schedule.')
    const returnUrlSuffix = translateDay(dayCode as string)
      .trim()
      .toLowerCase()
    return res.redirect(`/admin/time-slots#${returnUrlSuffix}`)
  }

  private getDuplicateOverlap(
    allSlots: TimeSlotSummary,
    id: number,
    dayCode: string,
    newStartTime: string,
    newEndTime: string,
    startDate: string,
    expiryDate: string,
  ) {
    return (allSlots?.timeSlots || []).some(slot => {
      const ts = slot.timeSlot
      // exclude the slot we're editing
      if (ts.prisonTimeSlotId === id) return false
      if (ts.dayCode !== dayCode || ts.startTime !== newStartTime || ts.endTime !== newEndTime) return false
      return dateRangeOverlap(ts.effectiveDate, ts.expiryDate, startDate, expiryDate)
    })
  }
}
