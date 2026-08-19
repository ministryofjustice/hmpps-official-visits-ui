import { Request, Response } from 'express'
import { schemaFactory } from './emailSchema'

describe('notification emailSchema', () => {
  const getSchema = () => schemaFactory({} as Request, {} as Response)

  const pathsAndMessages = (issues: { path: PropertyKey[]; message: string }[]) =>
    issues.map(issue => [issue.path.join('.'), issue.message])

  it('accepts a valid email address', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({ emailAddresses: ['example@example.com'] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailAddresses).toEqual(['example@example.com'])
    }
  })

  it('accepts several valid email addresses', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({
      emailAddresses: ['first@example.com', 'second@example.com'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailAddresses).toEqual(['first@example.com', 'second@example.com'])
    }
  })

  it('coerces a single string into an array', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({ emailAddresses: 'example@example.com' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailAddresses).toEqual(['example@example.com'])
    }
  })

  it('rejects a missing email address', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(pathsAndMessages(result.error.issues)).toEqual([['emailAddresses.0', 'Enter an email address']])
    }
  })

  it('asks only for the first address when every item is empty', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({ emailAddresses: [undefined, undefined] })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(pathsAndMessages(result.error.issues)).toEqual([['emailAddresses.0', 'Enter an email address']])
    }
  })

  it('rejects an item left empty after the user has added another one', async () => {
    const schema = await getSchema()

    // The user has to either fill the extra item in or remove it, rather than
    // having it silently dropped from under them.
    const result = await schema.safeParseAsync({
      emailAddresses: ['first@example.com', undefined],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(pathsAndMessages(result.error.issues)).toEqual([['emailAddresses.1', 'Enter an email address']])
    }
  })

  it('reports each empty item once at least one address has been entered', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({
      emailAddresses: [undefined, 'second@example.com', undefined],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(pathsAndMessages(result.error.issues)).toEqual([
        ['emailAddresses.0', 'Enter an email address'],
        ['emailAddresses.2', 'Enter an email address'],
      ])
    }
  })

  it('rejects an invalid email address format against the item that holds it', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({
      emailAddresses: ['valid@example.com', 'not-an-email'],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(pathsAndMessages(result.error.issues)).toEqual([
        ['emailAddresses.1', 'Enter an email address in the correct format'],
      ])
    }
  })
})
