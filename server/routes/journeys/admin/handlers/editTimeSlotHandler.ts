import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { CreateTimeSlotRequest, TimeSlot } from '../../../../@types/officialVisitsApi/types'
import { schema } from './timeSlotSchema'
import { getTime, translateDay } from '../../../../utils/utils'
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

    if (editMode) {
      // fetch existing time slot details to pre-populate the form
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
        // TODO: if not found or error ?
      }
    }
    const returnUrlSuffix = translateDay(dayCode).trim().toLowerCase()
    // Translate day code to readable label using existing partial if needed in template
    res.render('pages/admin/newTimeSlot', {
      dayCode,
      dayLabel: dayCode, // template will use a helper to translate if necessary
      backUrl: `/admin/days#${returnUrlSuffix}`,
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
    await this.officialVisitsService.updateTimeSlot(id, payload, user)

    res.addSuccessMessage('Time for visit updated', 'You have updated a visiting time in your prisons schedule.')
    const returnUrlSuffix = translateDay(dayCode as string)
      .trim()
      .toLowerCase()
    return res.redirect(`/admin/days#${returnUrlSuffix}`)
  }
}
