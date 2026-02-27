import {
  differenceInYears,
  format,
  isValid,
  parse,
  parseISO,
  set,
  startOfToday,
  previousMonday,
  isMonday,
  addWeeks,
  subWeeks,
  addDays,
  isBefore,
} from 'date-fns'
import { enGB } from 'date-fns/locale'
import { Request } from 'express'
import { components } from '../@types/officialVisitsApi'
import config from '../config'

const properCase = (word: string): string =>
  word.length >= 1 ? word[0].toUpperCase() + word.toLowerCase().slice(1) : word

const isBlank = (str: string): boolean => !str || /^\s*$/.test(str)

/**
 * Converts a name (first name, last name, middle name, etc.) to proper case equivalent, handling double-barreled names
 * correctly (i.e. each part in a double-barreled is converted to proper case).
 * @param name name to be converted.
 * @returns name converted to proper case.
 */
const properCaseName = (name: string): string => (isBlank(name) ? '' : name.split('-').map(properCase).join('-'))

export const convertToTitleCase = (sentence: string): string =>
  isBlank(sentence) ? '' : sentence.split(' ').map(properCaseName).join(' ')

export const lastNameCommaFirstName = (person: { firstName: string; lastName: string }): string => {
  return `${properCaseName(person.lastName)}, ${properCaseName(person.firstName)}`.replace(/(^, )|(, $)/, '')
}

export const firstNameSpaceLastName = (person: { firstName: string; lastName: string }): string => {
  return `${properCaseName(person.firstName)} ${properCaseName(person.lastName)}`.replace(/(^, )|(, $)/, '')
}

export const initialiseName = (fullName?: string): string | null => {
  // this check is for the authError page
  if (!fullName) return null

  const array = fullName.split(' ')
  return `${array[0][0]}. ${array.reverse()[0]}`
}

export const toDateString = (date: Date) => format(date, 'yyyy-MM-dd')

export const parseDate = (date: string, fromFormat = 'yyyy-MM-dd') => {
  if (!date) return null
  return parse(date, fromFormat, new Date())
}

export const formatDate = (date: string | Date, fmt = 'd MMMM yyyy') => {
  if (!date) return undefined
  const richDate = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(richDate)) return undefined
  return format(richDate, fmt)
}

// Returns "Over 18" if the supplied date of birth would make the holder over 18 today, or "Under 18" if not.
export const formatOverEighteen = (date: string | Date) => {
  if (!date) return undefined
  const richDate = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(richDate)) return undefined
  const yearsDiff = differenceInYears(new Date(), richDate)
  return yearsDiff >= 18 ? 'Over 18' : 'Under 18'
}

export const parseDatePickerDate = (datePickerDate: string): Date => {
  if (!datePickerDate) return null

  const dateFormatPattern = /(\d{1,2})([-/,. ])(\d{1,2})[-/,. ](\d{2,4})/

  if (!dateFormatPattern.test(datePickerDate)) return new Date(NaN)

  const dateMatches = datePickerDate.match(dateFormatPattern)

  const separator = dateMatches[2]
  const year = dateMatches[4]

  const date = parse(datePickerDate, `dd${separator}MM${separator}${'y'.repeat(year.length)}`, startOfToday())
  if (!isValid(date)) return new Date(NaN)

  return date
}

export const simpleDateToDate = (date: { day: string; month: string; year: string }): Date =>
  date.day || date.month || date.year
    ? parse(`${date.day}/${date.month}/${date.year}`, 'P', new Date(), { locale: enGB })
    : null

export const simpleTimeToDate = (time: { hour: string; minute: string }): Date =>
  time && (time.hour || time.minute)
    ? parse(`${time.hour}:${time.minute}`, 'HH:mm', new Date(0), { locale: enGB })
    : null

export const dateToSimpleTime = (date: Date): { hour: string; minute: string } => {
  if (!isValid(date)) return undefined
  const hour = format(date, 'HH')
  const minute = format(date, 'mm')
  return { hour, minute }
}

export const dateAtTime = (date: Date, time: Date): Date =>
  set(date, { hours: time.getHours(), minutes: time.getMinutes() })

export const toDuration = (minutes: number): string => {
  if (minutes < 0) throw new Error('Minutes cannot be negative')
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return (
    [h ? `${h} hour${h > 1 ? 's' : ''}` : '', m ? `${m} minute${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ') ||
    '0 minutes'
  )
}

export const isDateAndInThePast = (date?: string): boolean => {
  if (date) {
    const expirationDate = new Date(date)
    return expirationDate.getTime() < new Date().getTime()
  }
  return false
}

export const getParsedDateFromQueryString = (dateFromQueryString: string, defaultDate = new Date()): string => {
  const parsedDate =
    new Date(dateFromQueryString).toString() === 'Invalid Date'
      ? defaultDate
      : ensureNotBeforeToday(dateFromQueryString)

  return format(parsedDate, 'yyyy-MM-dd')
}

export const getWeekOfDatesStartingMonday = (
  date: string,
): { weekOfDates: { date: string; isInFuture: boolean }[]; previousWeek: string; nextWeek: string } => {
  const startingDate = new Date(date)
  if (startingDate.toString() === 'Invalid Date') return { weekOfDates: [], previousWeek: '', nextWeek: '' }

  const dateFormat = 'yyyy-MM-dd'
  const weekStartDate = isMonday(startingDate) ? startingDate : previousMonday(startingDate)
  const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().substring(0, 10)

  const weekOfDates = new Array(7).fill('').map((_day, index) => {
    const dayDate = format(addDays(weekStartDate, index), dateFormat)
    return { date: dayDate, isInFuture: isBefore(yesterday, dayDate) }
  }, {})

  const previousWeek = format(subWeeks(weekStartDate, 1), dateFormat)
  const nextWeek = format(addWeeks(weekStartDate, 1), dateFormat)

  return { weekOfDates, previousWeek, nextWeek }
}

export const prisonerTimePretty = (dateToFormat: string): string => {
  return dateToFormat ? format(parseISO(dateToFormat), 'h:mmaaa').replace(':00', '') : null
}

export const ensureNotBeforeToday = (dateToFormat: string): Date => {
  const selectedDate = parseISO(dateToFormat)
  const now = new Date()
  return isBefore(selectedDate, now) ? now : new Date(dateToFormat)
}

export const refDataRadiosMapper = (referenceData: components['schemas']['ReferenceDataItem']) => {
  return {
    value: referenceData.code,
    text: referenceData.description,
  }
}

/**
 * Returns a formatted string, for example '10am' or '11:30pm'
 * @param time String representing the time component of a date
 * @returns A formatted string representing the time in 12 hour format
 */
export const timeStringTo12HourPretty = (time: string, alwaysShowMinutes = false) => {
  const [hours, minutes] = time.split(':')
  // Convert to 12 hour time
  const twelveHours = Number(hours) % 12 || 12
  const amPm = Number(hours) >= 12 ? 'pm' : 'am'

  // If minutes are 0 only return hours
  if (minutes === '00' && !alwaysShowMinutes) {
    return twelveHours + amPm
  }

  return `${twelveHours}:${minutes}${amPm}`
}

export const formatAddressLines = (
  flat: string,
  property: string,
  street: string,
  area: string,
  postcode: string,
  noFixedAddress: boolean,
) => {
  if (noFixedAddress) return 'No fixed address'
  const addressArray = [flat, property, street, area, postcode].filter(s => s)
  return addressArray.length ? addressArray.join('\n') : null
}

export const getTimeDiff = (start: string, end: string): number => {
  const [sh, sm, ss] = start.split(':').map(Number)
  const [eh, em, es] = end.split(':').map(Number)

  const d1 = new Date(0, 0, 1, sh, sm, ss || 0)
  const d2 = new Date(0, 0, 1, eh, em, es || 0)

  return d2.getTime() - d1.getTime()
}

export const socialVisitorsPageEnabled = (req: Request) => {
  return config.featureToggles.allowSocialVisitorsPrisons
    .split(',')
    .includes(req.session.journey.officialVisit.prisonCode)
}

export const addRemoveLinks = (
  items: { text: string; value: string }[],
  filters: Record<string, string | string[]>,
  key: string,
) =>
  items.map(o => {
    const newValue = Array.isArray(filters[key]) ? filters[key].filter(v => v !== o.value) : []
    const { [key]: _omit, ...rest } = filters
    return {
      ...o,
      href: `?${new URLSearchParams({ ...rest, ...(newValue.length ? { [key]: newValue } : {}) }).toString()}`,
    }
  })

/**
 * Converts a day code (e.g. 'MON', 'TUE', 'WED') to its full weekday name (e.g. 'Monday', 'Tuesday', 'Wednesday').
 * Handles both three-letter codes and full uppercase names.
 * If the code is not recognized, returns the original code.
 * @param code The day code to convert.
 * @returns The full weekday name corresponding to the code, or the original code if not recognized.
 */
export const getDayName = (code: string) => {
  if (!code) return ''
  const map: Record<string, string> = {
    MON: 'Monday',
    TUE: 'Tuesday',
    WED: 'Wednesday',
    THU: 'Thursday',
    FRI: 'Friday',
    SAT: 'Saturday',
    SUN: 'Sunday',
  }
  const key = (code || '').toString().trim().toUpperCase()
  return map[key] || code
}

/**
 * Coerces empty strings, null, and undefined to undefined, while returning all other values unchanged.
 * This is useful for form processing where empty strings from form inputs should be treated as undefined.
 * @param v The value to coerce.
 * @returns Undefined if the input was an empty string, null, or undefined; otherwise returns the original value.
 */
export const emptyStringToUndefined = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return undefined
  return v
}

/**
 * Coerces a value to a Date object if it's a string in a recognizable date format, or returns it unchanged if it's already a Date or not a string.
 * Recognizes DD/MM/YYYY, DD/M/YYYY, and ISO yyyy-MM-dd formats as local dates (i.e. without timezone shifts).
 * @param v The value to coerce.
 * @returns A Date object if the input was a recognizable date string, or the original value otherwise.
 */
export const coerceDate = (v: string | Date) => {
  const val = emptyStringToUndefined(v)
  if (val === undefined) return undefined
  if (val instanceof Date) return val
  if (typeof val === 'string') {
    // Try parsing DD/M/YYYY or DD/MM/YYYY format
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    const match = val.match(dateRegex)
    if (match) {
      const [, day, month, year] = match
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    }
    // Explicitly handle ISO yyyy-mm-dd (HTML date inputs) as local date to avoid timezone shifts
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/
    const isoMatch = val.match(isoRegex)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    }
    // Fall back to standard Date constructor for other formats
    return new Date(val)
  }
  return val
}

/**
 * Checks if a value is a valid Date object (i.e. an instance of Date and not 'Invalid Date').
 * @param d The value to check.
 * @returns True if the value is a valid Date object, false otherwise.
 */
export const isValidDate = (d: Date) => d instanceof Date && !Number.isNaN(d.getTime())

/**
 * Returns a new Date object representing the start of the day (00:00:00) of the given date, in local time.
 * @param d The date for which to get the start of the day.
 * @returns A new Date object set to 00:00:00 of the given date in local time.
 */
export const startOfDayLocal = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/**
 * Formats a Date object as a string in 'yyyy-MM-dd' format, or returns undefined if the input is not a valid Date.
 * @param d The Date object to format.
 * @returns A string representing the date in 'yyyy-MM-dd' format, or undefined if the input is not a valid Date.
 */
export const formatDateToLocalDateString = (d?: Date | undefined) => {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return undefined
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Coerces a value to an integer if it's a string that can be parsed as an integer, or returns it unchanged if it's already a number or not a string.
 * @param v The value to coerce.
 * @returns An integer if the input was a string that can be parsed as an integer, or the original value otherwise.
 */
export const coerceInt = (v: string | unknown) => {
  const val = emptyStringToUndefined(v)
  if (val === undefined) return undefined
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed === '') return undefined
    const n = Number(trimmed)
    return Number.isNaN(n) ? trimmed : n
  }
  return val
}

/** Formats a time given separate hour and minute components into a string in 'HH:mm' format, padding with zeros as necessary.
 * @param hour The hour component of the time, as a number or string.
 * @param minute The minute component of the time, as a number or string.
 * @returns A string representing the time in 'HH:mm' format.
 */
export const getTime = (hour: string | unknown, minute: string | unknown) => {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export const toMinutesSinceMidnight = (hour: number, minute: number) => {
  return hour * 60 + minute
}

export const isWithinWorkingHours = (hour: number, minute: number, closingTime: number = 20) => {
  const OPEN = 8 * 60 // 08:00 -> 480
  const CLOSE = closingTime * 60 // 20:00 -> 1200
  const t = toMinutesSinceMidnight(hour, minute)
  return t >= OPEN && t <= CLOSE // 20:00 allowed, 20:01 rejected
}
