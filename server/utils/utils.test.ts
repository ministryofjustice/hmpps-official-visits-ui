import { isValid, parse, format } from 'date-fns'
import {
  convertToTitleCase,
  initialiseName,
  formatDate,
  dateToSimpleTime,
  dateAtTime,
  parseDatePickerDate,
  simpleDateToDate,
  simpleTimeToDate,
  toDateString,
  toDuration,
  getParsedDateFromQueryString,
  getWeekOfDatesStartingMonday,
} from './utils'

describe('convert to title case', () => {
  it.each([
    [null, null, ''],
    ['empty string', '', ''],
    ['Lower case', 'robert', 'Robert'],
    ['Upper case', 'ROBERT', 'Robert'],
    ['Mixed case', 'RoBErT', 'Robert'],
    ['Multiple words', 'RobeRT SMiTH', 'Robert Smith'],
    ['Leading spaces', '  RobeRT', '  Robert'],
    ['Trailing spaces', 'RobeRT  ', 'Robert  '],
    ['Hyphenated', 'Robert-John SmiTH-jONes-WILSON', 'Robert-John Smith-Jones-Wilson'],
  ])('%s convertToTitleCase(%s, %s)', (_: string, a: string, expected: string) => {
    expect(convertToTitleCase(a)).toEqual(expected)
  })
})

describe('initialise name', () => {
  it.each([
    [null, null, null],
    ['Empty string', '', null],
    ['One word', 'robert', 'r. robert'],
    ['Two words', 'Robert James', 'R. James'],
    ['Three words', 'Robert James Smith', 'R. Smith'],
    ['Double barrelled', 'Robert-John Smith-Jones-Wilson', 'R. Smith-Jones-Wilson'],
  ])('%s initialiseName(%s, %s)', (_: string, a: string, expected: string) => {
    expect(initialiseName(a)).toEqual(expected)
  })
})

describe('formatDate', () => {
  it.each([
    [null, null, 'd MMMM yyyy', undefined],
    ['empty string', '', 'd MMMM yyyy', undefined],
    ['Poor format string', '20-03-2022', 'd MMMM yyyy', undefined],
    ['ISO Date String', '2022-03-20', 'd MMMM yyyy', '20 March 2022'],
    ['Date Object', new Date(2022, 2, 20), 'd MMMM yyyy', '20 March 2022'],
  ])('%s formatDate(%s, %s)', (_: string, a: string | Date, fmt: string, expected: string) => {
    expect(formatDate(a, fmt)).toEqual(expected)
  })
})

describe('toDateString', () => {
  it('converts a date to a string', () => {
    expect(toDateString(new Date(2022, 2, 31))).toEqual('2022-03-31')
    expect(toDateString(new Date(2022, 9, 20))).toEqual('2022-10-20')
  })
})

describe('parseDatePickerDate', () => {
  it('is not a date', () => {
    expect(isValid(parseDatePickerDate('bad string'))).toBeFalsy()
  })

  it('is invalid date', () => {
    expect(isValid(parseDatePickerDate('31/02/2022'))).toBeFalsy()
  })

  it.each([
    { datePickerDate: '23-10-2023', separator: '-' },
    { datePickerDate: '23/10/2023', separator: '/' },
    { datePickerDate: '23,10,2023', separator: ',' },
    { datePickerDate: '23.10.2023', separator: '.' },
    { datePickerDate: '23 10 2023', separator: ' ' },
  ])("parses date string when separator is '$separator'", async ({ datePickerDate }) => {
    const date = parseDatePickerDate(datePickerDate)

    expect(date).toEqual(parse('2023-10-23', 'yyyy-MM-dd', new Date()))
  })

  it('parses one digit day and month and two digit year', () => {
    const date = parseDatePickerDate('2/9/23')

    expect(date).toEqual(parse('2023-09-02', 'yyyy-MM-dd', new Date()))
  })

  it('parses three digit year', () => {
    const date = parseDatePickerDate('02/09/223')

    expect(date).toEqual(parse('0223-09-02', 'yyyy-MM-dd', new Date()))
  })
})

describe('simpleDateToDate', () => {
  it('has all empty fields', () => {
    expect(simpleDateToDate({ day: '', month: '', year: '' })).toEqual(null)
  })

  it('is invalid', () => {
    expect(isValid(simpleDateToDate({ day: '31', month: '02', year: '2022' }))).toBeFalsy()
  })

  it('is valid', () => {
    const date = simpleDateToDate({ day: '20', month: '03', year: '2022' })
    expect(date).toEqual(parse('2022-03-20', 'yyyy-MM-dd', new Date()))
  })
})

describe('simpleTimeToDate', () => {
  it('has all empty fields', () => {
    expect(simpleTimeToDate({ hour: '', minute: '' })).toEqual(null)
  })

  it('is invalid', () => {
    expect(isValid(simpleTimeToDate({ hour: '25', minute: '00' }))).toBeFalsy()
  })

  it('is valid', () => {
    const date = simpleTimeToDate({ hour: '13', minute: '35' })
    expect(date).toEqual(parse('13:35', 'HH:mm', new Date(0)))
  })
})

describe('dateToSimpleTime', () => {
  // TODO: These tests suffer from timezone issues - Tim to address
  it('invalid date returns undefined', () => {
    expect(dateToSimpleTime(null)).toEqual(undefined)
    expect(dateToSimpleTime(new Date('1970-02-32T17:50:00.000Z'))).toEqual(undefined)
  })

  it('is valid', () => {
    expect(dateToSimpleTime(new Date('1970-01-01T17:50:00.000Z'))).toEqual({ hour: '17', minute: '50' })
    expect(dateToSimpleTime(new Date('1970-01-01T22:22:00.000Z'))).toEqual({ hour: '22', minute: '22' })
    expect(dateToSimpleTime(new Date('1977-10-03T23:59:00.000Z'))).toEqual({ hour: '23', minute: '59' })
  })

  it('pads hour and minute to 2-digits', () => {
    expect(dateToSimpleTime(new Date('1970-01-01T01:03:00.000Z'))).toEqual({ hour: '01', minute: '03' })
    expect(dateToSimpleTime(new Date('1970-01-01T11:02:00.000Z'))).toEqual({ hour: '11', minute: '02' })
  })
})

describe('dateAtTime', () => {
  it('returns a new date with the time set correctly', () => {
    const date = parse('2022-03-20', 'yyyy-MM-dd', new Date())
    const time = parse('13:35', 'HH:mm', new Date(0))

    expect(dateAtTime(date, time)).toEqual(parse('2022-03-20 13:35', 'yyyy-MM-dd HH:mm', new Date()))
  })
})

describe('toDuration', () => {
  it.each([
    [0, '0 minutes'],
    [1, '1 minute'],
    [45, '45 minutes'],
    [60, '1 hour'],
    [90, '1 hour 30 minutes'],
    [120, '2 hours'],
    [185, '3 hours 5 minutes'],
  ])("converts %i minutes to '%s'", (input, expected) => {
    expect(toDuration(input)).toBe(expected)
  })

  it('throws an error for negative minutes', () => {
    expect(() => toDuration(-10)).toThrow('Minutes cannot be negative')
  })
})

describe('getParsedDateFromQueryString', () => {
  const today = format(new Date(), 'yyyy-MM-dd')

  ;[
    {
      input: '2022-05-22',
      expected: today,
    },
    {
      input: '2222-00-12',
      expected: today,
    },
    {
      input: '!&"-bad-input',
      expected: today,
    },
    {
      input: '2028-05-22',
      expected: '2028-05-22',
    },
  ].forEach(testData => {
    it(`should output ${testData.expected} when supplied with ${testData.input}`, () => {
      expect(getParsedDateFromQueryString(testData.input)).toBe(testData.expected)
    })
  })
})

describe('getWeekOfDatesStartingMonday', () => {
  const weekOfDates = {
    weekOfDates: ['2022-12-26', '2022-12-27', '2022-12-28', '2022-12-29', '2022-12-30', '2022-12-31', '2023-01-01'],
    previousWeek: '2022-12-19',
    nextWeek: '2023-01-02',
  }

  it('should return a week of dates starting on the given date when it is a Monday', () => {
    expect(getWeekOfDatesStartingMonday('2022-12-26')).toStrictEqual(weekOfDates)
  })

  it('should return a week of dates starting on the previous closest Monday when given a Wednesday', () => {
    expect(getWeekOfDatesStartingMonday('2022-12-28')).toStrictEqual(weekOfDates)
  })

  it('should return a week of dates starting on the previous closest Monday when given a Sunday', () => {
    expect(getWeekOfDatesStartingMonday('2023-01-01')).toStrictEqual(weekOfDates)
  })

  it('should return an empty array if given an invalid date', () => {
    expect(getWeekOfDatesStartingMonday('NOT A DATE')).toStrictEqual({
      weekOfDates: [],
      previousWeek: '',
      nextWeek: '',
    })
  })
})
