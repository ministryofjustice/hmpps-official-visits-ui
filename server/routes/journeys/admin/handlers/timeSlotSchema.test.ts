import { schema } from './timeSlotSchema'

describe('admin timeSlotSchema', () => {
  const START_DATE_ERROR_MESSAGE = 'Select a date that is today or in the future for the start date'
  const END_DATE_ERROR_MESSAGE = 'Select a date that is today or in the future for the end date'
  const DAY_CODE_ERROR_MESSAGE = 'Unrecognised day code (e.g. MON, TUE, WED)'

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  it('accepts a valid payload', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      expiryDate: tomorrowStr,
      dayCode: 'MON',
      'startTime-startHour': '09',
      'startTime-startMinute': '00',
      'endTime-endHour': '10',
      'endTime-endMinute': '00',
    })

    expect(result.success).toBeTruthy()
    if (result.success) {
      // startDate and expiryDate should be coerced to Date objects
      expect(result.data.startDate).toBe(tomorrowStr)
      expect(result.data.expiryDate).toBe(tomorrowStr)
      expect(result.data['startTime-startHour']).toBe(9)
      expect(result.data['startTime-startMinute']).toBe(0)
      expect(result.data['endTime-endHour']).toBe(10)
      expect(result.data['endTime-endMinute']).toBe(0)
    }
  })

  it('accepts when expiryDate is omitted (optional)', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      // expiryDate omitted
      dayCode: 'MON',
      'startTime-startHour': '09',
      'startTime-startMinute': '00',
      'endTime-endHour': '10',
      'endTime-endMinute': '00',
    })

    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.expiryDate).toBeUndefined()
    }
  })

  it('rejects a startDate in the past', async () => {
    const result = await schema.safeParseAsync({
      startDate: yesterdayStr,
      expiryDate: tomorrowStr,
      dayCode: 'MON',
      'startTime-startHour': '09',
      'startTime-startMinute': '00',
      'endTime-endHour': '10',
      'endTime-endMinute': '00',
    })

    expect(result.success).toBeFalsy()
    expect(result.error?.issues.some((i: { message: string }) => i.message === START_DATE_ERROR_MESSAGE)).toBeTruthy()
  })

  it('rejects an invalid expiryDate', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      expiryDate: 'not-a-date',
      dayCode: 'MON',
      'startTime-startHour': '09',
      'startTime-startMinute': '00',
      'endTime-endHour': '10',
      'endTime-endMinute': '00',
    })

    expect(result.success).toBeFalsy()
    // Ensure our custom invalid/required message for expiryDate is present
    expect(
      result.error?.issues.some((i: { message: string }) => i.message === 'Enter a valid expiry date'),
    ).toBeTruthy()
  })

  it('rejects an expiryDate in the past', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      expiryDate: yesterdayStr,
      dayCode: 'MON',
      'startTime-startHour': '09',
      'startTime-startMinute': '00',
      'endTime-endHour': '10',
      'endTime-endMinute': '00',
    })

    expect(result.success).toBeFalsy()
    expect(result.error?.issues.some((i: { message: string }) => i.message === END_DATE_ERROR_MESSAGE)).toBeTruthy()
  })

  it('rejects an invalid dayCode', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      expiryDate: tomorrowStr,
      dayCode: 'ABC', // Invalid day code
      'startTime-startHour': '09',
      'startTime-startMinute': '00',
      'endTime-endHour': '10',
      'endTime-endMinute': '00',
    })

    expect(result.success).toBeFalsy()
    expect(result.error?.issues.some((i: { message: string }) => i.message === DAY_CODE_ERROR_MESSAGE)).toBeTruthy()
  })

  it('rejects out of range startHour and endHour', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      expiryDate: tomorrowStr,
      dayCode: 'MON',
      'startTime-startHour': '7',
      'startTime-startMinute': '0',
      'endTime-endHour': '22',
      'endTime-endMinute': '00',
    })

    expect(result.success).toBeFalsy()
    // Should have at least one issue about numeric range
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(1)
  })

  it('rejects start time outside of 08:00-21:00', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      expiryDate: tomorrowStr,
      dayCode: 'MON',
      'startTime-startHour': '20',
      'startTime-startMinute': '1',
      'endTime-endHour': '10',
      'endTime-endMinute': '00',
    })

    expect(result.success).toBeFalsy()
    // Should have at least one issue about numeric range
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(1)
    expect(
      result.error?.issues.some((i: { message: string }) => i.message === 'Enter start time between 08:00 and 20:00'),
    ).toBeTruthy()
  })

  it('rejects end time outside of 08:00-21:00', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      expiryDate: tomorrowStr,
      dayCode: 'MON',
      'startTime-startHour': '09',
      'startTime-startMinute': '00',
      'endTime-endHour': '21',
      'endTime-endMinute': '1',
    })

    expect(result.success).toBeFalsy()
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(1)
    expect(
      result.error?.issues.some((i: { message: string }) => i.message === 'Enter end time between 08:00 and 21:00'),
    ).toBeTruthy()
  })

  it('rejects start time before 08:00', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      expiryDate: tomorrowStr,
      dayCode: 'MON',
      'startTime-startHour': '07',
      'startTime-startMinute': '59',
      'endTime-endHour': '10',
      'endTime-endMinute': '00',
    })

    expect(result.success).toBeFalsy()
    expect(
      result.error?.issues.some((i: { message: string }) => i.message === 'Enter start time between 08:00 and 20:00'),
    ).toBeTruthy()
  })

  it('rejects end time before 08:00', async () => {
    const result = await schema.safeParseAsync({
      startDate: tomorrowStr,
      expiryDate: tomorrowStr,
      dayCode: 'MON',
      'startTime-startHour': '07',
      'startTime-startMinute': '00',
      'endTime-endHour': '07',
      'endTime-endMinute': '59',
    })

    expect(result.success).toBeFalsy()
    expect(
      result.error?.issues.some((i: { message: string }) => i.message === 'Enter end time between 08:00 and 21:00'),
    ).toBeTruthy()
  })
})
