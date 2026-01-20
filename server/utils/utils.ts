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
