import { dateRangeOverlap } from './dateRangeOverlap'

describe('dateRangeOverlap', () => {
  it('returns true when ranges overlap', () => {
    const existingStart = '2025-01-01'
    const existingExpiry = '2025-12-31'
    const candidateStart = '2025-06-01'
    const candidateExpiry = '2025-06-30'

    expect(dateRangeOverlap(existingStart, existingExpiry, candidateStart, candidateExpiry)).toBe(true)
  })

  it('returns false when candidate starts after existing expiry', () => {
    const existingStart = '2025-01-01'
    const existingExpiry = '2025-12-31'
    const candidateStart = '2026-01-01'
    const candidateExpiry = '2026-12-31'

    expect(dateRangeOverlap(existingStart, existingExpiry, candidateStart, candidateExpiry)).toBe(false)
  })

  it('returns false when candidate expiry is before existing start', () => {
    const existingStart = '2025-06-01'
    const existingExpiry = '2025-12-31'
    const candidateStart = '2025-01-01'
    const candidateExpiry = '2025-05-31'

    expect(dateRangeOverlap(existingStart, existingExpiry, candidateStart, candidateExpiry)).toBe(false)
  })

  it('treats equality of end/start as overlapping (inclusive)', () => {
    const existingStart = '2025-01-01'
    const existingExpiry = '2025-06-01'
    const candidateStart = '2025-06-01'
    const candidateExpiry = '2025-12-31'

    expect(dateRangeOverlap(existingStart, existingExpiry, candidateStart, candidateExpiry)).toBe(true)
  })

  it('treats candidate expiry equal to existing start as overlapping (inclusive)', () => {
    const existingStart = '2025-06-01'
    const existingExpiry = '2025-12-31'
    const candidateStart = '2025-01-01'
    const candidateExpiry = '2025-06-01'

    expect(dateRangeOverlap(existingStart, existingExpiry, candidateStart, candidateExpiry)).toBe(true)
  })

  it('treats missing existing expiry as open-ended (overlap)', () => {
    const existingStart = '2025-01-01'
    const existingExpiry: string = null
    const candidateStart = '2026-01-01'
    const candidateExpiry = '2026-12-31'

    // existingExpiry is open-ended -> overlap
    expect(dateRangeOverlap(existingStart, existingExpiry, candidateStart, candidateExpiry)).toBe(true)
  })

  it('treats missing candidate expiry as open-ended (overlap)', () => {
    const existingStart = '2055-01-01'
    const existingExpiry = '2056-12-31'
    const candidateStart = '2050-01-01'
    const candidateExpiry: string = null

    // candidateExpiry is open-ended -> overlap
    expect(dateRangeOverlap(existingStart, existingExpiry, candidateStart, candidateExpiry)).toBe(true)
  })

  it('treats unparsable start dates as overlapping (conservative)', () => {
    expect(dateRangeOverlap('invalid', '2025-12-31', '2025-06-01', '2025-06-30')).toBe(true)
    expect(dateRangeOverlap('2025-01-01', '2025-12-31', 'invalid', '2025-06-30')).toBe(true)
  })
})
