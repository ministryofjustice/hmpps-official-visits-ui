import { Request, Response } from 'express'
import { schemaFactory } from './emailSchema'

describe('notification emailSchema', () => {
  const getSchema = () => schemaFactory({} as Request, {} as Response)

  it('accepts a valid email address', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({
      emailAddress: 'example@example.com',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailAddress).toBe('example@example.com')
    }
  })

  it('rejects a missing email address', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.message === 'Enter an email address')).toBe(true)
    }
  })

  it('rejects an invalid email address format', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({
      emailAddress: 'not-an-email',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.message === 'Enter an email address in the correct format')).toBe(
        true,
      )
    }
  })
})
