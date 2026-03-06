import { schema } from './newLocationSchema'

describe('newLocationSchema', () => {
  it('parses valid input and transforms numeric strings to numbers', async () => {
    const result = await schema.safeParse({ dpsLocationId: 'loc1', maxAdults: '2', maxGroups: '3', maxVideo: '1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dpsLocationId).toBe('loc1')
      expect(result.data.maxAdults).toBe(2)
      expect(result.data.maxGroups).toBe(3)
      expect(result.data.maxVideo).toBe(1)
    }
  })

  it('errors when dpsLocationId is missing', async () => {
    const result = await schema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error?.issues.some((i: { message: string }) => i.message === 'Select a location')).toBeTruthy()
    }
  })

  it('errors when maxAdults is non-integer', async () => {
    const result = await schema.safeParse({ dpsLocationId: 'x', maxAdults: '2.5' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error?.issues.some((i: { message: string }) => i.message === 'Enter a valid number')).toBeTruthy()
    }
  })

  it('errors when maxGroups is out of allowed range', async () => {
    const result = await schema.safeParse({ dpsLocationId: 'x', maxGroups: '1000' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error?.issues.some((i: { message: string }) => i.message === 'Enter a number between 0 and 999'),
      ).toBeTruthy()
    }
  })

  it('allows empty strings for optional numeric fields (treated as undefined)', async () => {
    const result = await schema.safeParse({ dpsLocationId: 'x', maxAdults: '', maxGroups: '', maxVideo: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.maxAdults).toBeUndefined()
      expect(result.data.maxGroups).toBeUndefined()
      expect(result.data.maxVideo).toBeUndefined()
    }
  })
})
