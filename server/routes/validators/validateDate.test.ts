import { checkTodayOrFuture, getMinDateChecker, validateDateOptional, validateTransformDate } from './validateDate'

describe('getMinDateChecker', () => {
  it('should return a function that returns true when the provided date is after the min date', () => {
    const minDate = new Date('2022-01-01')
    const checker = getMinDateChecker(minDate)
    expect(checker(new Date('2022-01-03'))).toBeTruthy()
  })

  it('should return a function that returns false when the provided date is before the min date', () => {
    const minDate = new Date('2022-01-02')
    const checker = getMinDateChecker(minDate)
    expect(checker(new Date('2022-01-01'))).toBeFalsy()
  })
})

describe('checkTodayOrFuture', () => {
  it('should return a function that returns true when the provided date is today', () => {
    expect(checkTodayOrFuture(new Date())).toBeTruthy()
  })
})

describe('validateTransformDate', () => {
  const schema = validateTransformDate(() => true, 'Missing date', 'Invalid date', 'Custom check failed')
  it('should return an invalid error when an impossible date is provided', () => {
    const actual = schema.safeParse('32-02-1337')
    expect(actual.success).toBeFalsy()
    expect(actual.error.issues).toHaveLength(1)
    expect(actual.error.issues[0].message).toEqual('Invalid date')
  })

  it('should return an invalid error when the date is invalid', () => {
    const actual = schema.safeParse('not-a-date')
    expect(actual.success).toBeFalsy()
    expect(actual.error.issues).toHaveLength(1)
    expect(actual.error.issues[0].message).toEqual('Invalid date')
  })

  it('should return invalid error when a broken date string is provided', () => {
    const actual = schema.safeParse('305-1337')
    expect(actual.success).toBeFalsy()
    expect(actual.error.issues).toHaveLength(1)
    expect(actual.error.issues[0].message).toEqual('Invalid date')
  })

  it('should return a custom error when the custom checker fails', () => {
    const actual = validateTransformDate(() => false, 'Missing date', 'Invalid date', 'Custom check failed').safeParse(
      '25-12-2000',
    )
    expect(actual.success).toBeFalsy()
    expect(actual.error.issues).toHaveLength(1)
    expect(actual.error.issues[0].message).toEqual('Custom check failed')
  })

  it('should return a missing date error when the input is blank', () => {
    const actual = schema.safeParse('')
    expect(actual.success).toBeFalsy()
    expect(actual.error.issues).toHaveLength(1)
    expect(actual.error.issues[0].message).toEqual('Missing date')
  })

  it('should parse the date correctly when a valid date is provided', () => {
    const actual = schema.safeParse('25-12-2000')
    expect(actual.success).toBeTruthy()
    expect(actual.error).toBeFalsy()
    expect(actual.data).toEqual('2000-12-25')
  })
})

describe('validateDateOptional', () => {
  const schema = validateDateOptional('Invalid date')
  it('should return an invalid error when an impossible date is provided', () => {
    const actual = schema.safeParse('32-02-1337')
    expect(actual.success).toBeFalsy()
    expect(actual.error.issues).toHaveLength(1)
    expect(actual.error.issues[0].message).toEqual('Invalid date')
  })

  it('should return an invalid error when the date is invalid', () => {
    const actual = schema.safeParse('not-a-date')
    expect(actual.success).toBeFalsy()
    expect(actual.error.issues).toHaveLength(1)
    expect(actual.error.issues[0].message).toEqual('Invalid date')
  })

  it('should return invalid error when a broken date string is provided', () => {
    const actual = schema.safeParse('305-1337')
    expect(actual.success).toBeFalsy()
    expect(actual.error.issues).toHaveLength(1)
    expect(actual.error.issues[0].message).toEqual('Invalid date')
  })

  it('should pass when the input is undefined', () => {
    const actual = schema.safeParse(undefined)
    expect(actual.success).toBeTruthy()
  })
})
