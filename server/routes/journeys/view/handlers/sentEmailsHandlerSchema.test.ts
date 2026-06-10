import { schema } from './sentEmailsHandlerSchema'

describe('sentEmailsHandlerSchema', () => {
  it('transforms valid date query params into Date objects', async () => {
    const result = await schema.safeParseAsync({
      fromDate: '15/05/2026',
      toDate: '20/05/2026',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fromDate).toEqual(new Date(2026, 4, 15))
      expect(result.data.toDate).toEqual(new Date(2026, 4, 20))
    }
  })

  it('rejects an invalid from date', async () => {
    const result = await schema.safeParseAsync({ fromDate: '32/05/2026' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'From date must be a real date', path: ['fromDate'] }),
        ]),
      )
    }
  })

  it('rejects an invalid to date', async () => {
    const result = await schema.safeParseAsync({ toDate: '20/13/2026' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: 'To date must be a real date', path: ['toDate'] })]),
      )
    }
  })

  it('rejects a from date that is after the to date', async () => {
    const result = await schema.safeParseAsync({ fromDate: '20/05/2026', toDate: '15/05/2026' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'To date must be the same or after the from date',
            path: ['toDate'],
          }),
        ]),
      )
    }
  })
})
