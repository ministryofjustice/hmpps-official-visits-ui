function getExpiryMs(input: string) {
  return Number.isNaN(Date.parse(String(input || ''))) ? Number.POSITIVE_INFINITY : Date.parse(String(input || ''))
}

/**
 * Determine whether two date ranges overlap.
 *
 * existingStart/existingExpiry and candidateStart/candidateExpiry are expected to be date strings
 * in ISO yyyy-mm-dd format (as used by the UI). The function will:
 * - treat missing or unparsable effective dates as overlapping (conservative)
 * - treat missing or unparsable expiry dates as open-ended (Infinity)
 * - return true when ranges overlap; false when they do not overlap
 *
 * Overlap logic: ranges do NOT overlap only when existingExpiry < candidateStart OR candidateExpiry < existingStart
 * Strict inequality is used so equality (existingExpiry === candidateStart) is considered overlapping.
 */
export function dateRangeOverlap(
  existingStart: string,
  existingExpiry: string | null,
  candidateStart: string,
  candidateExpiry: string | null,
): boolean {
  const existingStartMs = Date.parse(String(existingStart || ''))
  const existingExpiryMs = getExpiryMs(existingExpiry)

  const candidateStartMs = Date.parse(String(candidateStart || ''))
  const candidateExpiryMs = getExpiryMs(candidateExpiry)

  // If either start date fails to parse, treat as overlapping to be safe
  if (Number.isNaN(existingStartMs) || Number.isNaN(candidateStartMs)) return true

  // No overlap only if existingExpiry < candidateStart OR candidateExpiry < existingStart
  if (existingExpiryMs < candidateStartMs || candidateExpiryMs < existingStartMs) return false

  // Otherwise intervals overlap
  return true
}
