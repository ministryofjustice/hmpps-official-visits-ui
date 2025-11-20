import {
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
import { components } from '../@types/officialVisitsApi'

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
export const getParsedDateFromQueryString = (dateFromQueryString: string, defaultDate = new Date()): string => {
  const parsedDate =
    new Date(dateFromQueryString).toString() === 'Invalid Date'
      ? defaultDate
      : ensureNotBeforeToday(dateFromQueryString)

  return format(parsedDate, 'yyyy-MM-dd')
}

export const getWeekOfDatesStartingMonday = (
  date: string,
): { weekOfDates: string[]; previousWeek: string; nextWeek: string } => {
  const startingDate = new Date(date)
  if (startingDate.toString() === 'Invalid Date') return { weekOfDates: [], previousWeek: '', nextWeek: '' }

  const dateFormat = 'yyyy-MM-dd'
  const weekStartDate = isMonday(startingDate) ? startingDate : previousMonday(startingDate)

  const weekOfDates = new Array(7).fill('').map((_day, index) => {
    return format(addDays(weekStartDate, index), dateFormat)
  })

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
