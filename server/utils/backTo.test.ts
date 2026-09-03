import { decodeBackTo, encodeBackTo } from './backTo'

describe('backTo', () => {
  it.each([
    '/review/list',
    '/review/list?page=2',
    '/view/list?page=1&startDate=2026-01-28&endDate=2026-03-29',
    '/view/list?search=O%27Brien',
    '/view/list?search=a~b~c~d~',
  ])('should round trip %s', url => {
    expect(decodeBackTo(encodeBackTo(url))).toBe(url)
  })

  it('should produce a token that is safe to concatenate into a query string', () => {
    const token = encodeBackTo('/review/list?search=a~b~c~d~')

    expect(token).not.toMatch(/[+/=]/)
    expect(token).toBe(encodeURIComponent(token))
  })

  it('should keep percent encoding in the url intact', () => {
    expect(decodeBackTo(encodeBackTo('/view/list?search=O%27Brien'))).toBe('/view/list?search=O%27Brien')
  })

  it.each([
    ['an offsite url', 'https://evil.example.com'],
    ['a protocol relative url', '//evil.example.com'],
    ['a non http scheme', 'data:text/html,hello'],
  ])('should refuse %s', (_label, url) => {
    expect(decodeBackTo(encodeBackTo(url))).toBeNull()
  })

  it.each([
    ['an empty token', ''],
    ['undefined', undefined as unknown as string],
    ['rubbish', 'not-base64!!'],
  ])('should return null for %s', (_label, token) => {
    expect(decodeBackTo(token)).toBeNull()
  })
})
