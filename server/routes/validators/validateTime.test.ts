import { parseHour } from './validateTime'

describe('parseHour', () => {
  it.each([
    ['23', '23'],
    ['12', '12'],
    ['01', '01'],
    ['1', '01'],
    ['00', '00'],
  ])('"%s" should return "%s"', (input, expected) => {
    expect(parseHour(input)).toEqual({ data: expected, success: true })
  })

  it.each([
    ['24', 1],
    ['25', 1],
    ['a', 2],
    ['', 1],
    ['-1', 2],
  ])('"%s" should not parse', (input, errorCount) => {
    const actual = parseHour(input)
    expect(actual.success).toBeFalsy()
    expect(actual.error.issues).toHaveLength(errorCount)
  })
})
