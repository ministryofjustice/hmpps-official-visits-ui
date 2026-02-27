import { z } from 'zod'
import {
  coerceDate,
  coerceInt,
  formatDateToLocalDateString,
  isValidDate,
  isWithinWorkingHours,
  startOfDayLocal,
} from '../../../../utils/utils'

// Error messages
const ERROR_START_DATE_REQUIRED = 'Enter a start date'
const ERROR_START_DATE_INVALID = 'Enter a valid start date'
const ERROR_START_DATE_PAST = 'Select a date that is today or in the future for the start date'

const ERROR_EXPIRY_DATE_INVALID = 'Enter a valid expiry date'
const ERROR_EXPIRY_DATE_PAST = 'Select a date that is today or in the future for the end date'
const ERROR_EXPIRY_BEFORE_START = 'End date must be the same as or after the start date'

const ERROR_END_TIME_AFTER_START = 'End time must be after the start time'

const START_TIME_REQUIRED = 'Enter a valid start time'
const INVALID_START_TIME_RANGE = 'Enter start time between 08:00 and 20:00'
const END_TIME_REQUIRED = 'Enter a valid end time'
const INVALID_END_TIME_RANGE = 'Enter end time between 08:00 and 21:00'
const VALID_DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export const schema = z
  .object({
    startDate: z.any().transform(v => coerceDate(v)),
    expiryDate: z
      .any()
      .transform(v => coerceDate(v))
      .optional(),
    dayCode: z.string().min(3).max(3, { message: 'DayCode must be 3 characters' }).optional(),
    'startTime-startHour': z.any().transform(v => coerceInt(v)),
    'startTime-startMinute': z.any().transform(v => coerceInt(v)),
    'endTime-endHour': z.any().transform(v => coerceInt(v)),
    'endTime-endMinute': z.any().transform(v => coerceInt(v)),
  })
  .superRefine((data, ctx) => {
    // Deterministic ordering of errors is important. We add issues in the sequence below.

    // 1) Start date: required -> invalid -> past
    const rawStart = data.startDate
    const startIsMissing = typeof rawStart === 'undefined' || rawStart === null || rawStart === ''
    const startIsDate = rawStart instanceof Date && isValidDate(rawStart)

    if (startIsMissing) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: ERROR_START_DATE_REQUIRED })
    } else if (!startIsDate) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: ERROR_START_DATE_INVALID })
    } else {
      const startDay = startOfDayLocal(rawStart as Date)
      const today = startOfDayLocal(new Date())
      if (startDay.getTime() < today.getTime()) {
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: ERROR_START_DATE_PAST })
      }
    }

    // 2) Expiry date: optional -> if provided then invalid -> past -> before start
    const rawExpiry = data.expiryDate
    const expiryProvided = typeof rawExpiry !== 'undefined' && rawExpiry !== null && rawExpiry !== ''
    const expiryIsDate = rawExpiry instanceof Date && isValidDate(rawExpiry)

    // If expiry is provided but invalid, add that issue first before any further checks that assume it's a valid date
    if (expiryProvided && !expiryIsDate) {
      ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: ERROR_EXPIRY_DATE_INVALID })
    } else if (expiryIsDate) {
      const expiryDay = startOfDayLocal(rawExpiry as Date)
      const today = startOfDayLocal(new Date())
      if (expiryDay.getTime() < today.getTime()) {
        ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: ERROR_EXPIRY_DATE_PAST })
      }
    }

    // If both valid dates are present, check expiry >= start
    if (startIsDate && expiryIsDate) {
      const startDay = startOfDayLocal(rawStart as Date)
      const expiryDay = startOfDayLocal(rawExpiry as Date)
      if (expiryDay.getTime() < startDay.getTime()) {
        ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: ERROR_EXPIRY_BEFORE_START })
      }
    }

    // 3) Time fields: required -> type (integer) -> range
    const checkTimeField = (
      hourField: string,
      minField: string,
      pathPrefix: string,
      hourMax: number,
      invalidMsg: string,
      rangeMsg: string,
    ) => {
      const hourVal = (data as Record<string, unknown>)[hourField]
      const minVal = (data as Record<string, unknown>)[minField]

      const hourMissing = typeof hourVal === 'undefined' || hourVal === null || hourVal === ''
      const minMissing = typeof minVal === 'undefined' || minVal === null || minVal === ''

      if (hourMissing || minMissing) {
        ctx.addIssue({ code: 'custom', path: [pathPrefix], message: invalidMsg })
        return
      }

      if (
        typeof hourVal !== 'number' ||
        !Number.isInteger(hourVal) ||
        typeof minVal !== 'number' ||
        !Number.isInteger(minVal)
      ) {
        ctx.addIssue({ code: 'custom', path: [pathPrefix], message: invalidMsg })
        return
      }

      // Now we know they are integers, we can check the valid ranges
      if (!isWithinWorkingHours(hourVal, minVal, hourMax)) {
        ctx.addIssue({ code: 'custom', path: [pathPrefix], message: rangeMsg })
      }
    }

    checkTimeField(
      'startTime-startHour',
      'startTime-startMinute',
      'startTime',
      20,
      START_TIME_REQUIRED,
      INVALID_START_TIME_RANGE,
    )
    checkTimeField('endTime-endHour', 'endTime-endMinute', 'endTime', 21, END_TIME_REQUIRED, INVALID_END_TIME_RANGE)

    // 4) Cross-field time logic: build Date objects and ensure end > start when dates are equal
    // Only run this when start date is valid and all time parts are present and numeric
    const sh = data['startTime-startHour']
    const sm = data['startTime-startMinute']
    const eh = data['endTime-endHour']
    const em = data['endTime-endMinute']

    if (
      startIsDate &&
      typeof sh === 'number' &&
      typeof sm === 'number' &&
      typeof eh === 'number' &&
      typeof em === 'number'
    ) {
      const startDay = startOfDayLocal(rawStart as Date)

      const startDateTime = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), sh, sm)
      const endDateTime = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), eh, em)

      if (!(endDateTime.getTime() > startDateTime.getTime())) {
        ctx.addIssue({ code: 'custom', path: ['endTime-endHour'], message: ERROR_END_TIME_AFTER_START })
      }
    }

    // validate if the dayCode, if provided, is a valid day code (e.g. MON, TUE, WED, THU, FRI, SAT, SUN)

    if (data.dayCode && !VALID_DAY_CODES.includes(data.dayCode)) {
      ctx.addIssue({ code: 'custom', path: ['dayCode'], message: 'Unrecognised day code (e.g. MON, TUE, WED)' })
    }
  })
  // After successful validation, transform Date objects into yyyy-MM-dd strings compatible with java.time.LocalDate
  .transform(data => ({
    ...data,
    startDate: formatDateToLocalDateString(data.startDate as Date),
    expiryDate: formatDateToLocalDateString(data.expiryDate as Date),
  }))
