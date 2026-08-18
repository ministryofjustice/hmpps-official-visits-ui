import { Request, Response } from 'express'
import { schemaFactory } from './videoLinkSchema'

describe('notification videoLinkSchema', () => {
  const getSchema = () => schemaFactory({} as Request, {} as Response)

  it('accepts a valid https video link', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({
      videoLinkUrl: 'https://video.example.com/room-123',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.videoLinkUrl).toBe('https://video.example.com/room-123')
    }
  })

  it('rejects a missing video link', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.message === 'Enter the video link in full')).toBe(true)
    }
  })

  it('rejects a non-https video link', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({
      videoLinkUrl: 'http://video.example.com/room-123',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some(issue => issue.message === 'Enter a valid video link that starts with https://'),
      ).toBe(true)
    }
  })

  it('rejects an invalid url value', async () => {
    const schema = await getSchema()

    const result = await schema.safeParseAsync({
      videoLinkUrl: 'not-a-url',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some(issue => issue.message === 'Enter a valid video link that starts with https://'),
      ).toBe(true)
    }
  })
})
