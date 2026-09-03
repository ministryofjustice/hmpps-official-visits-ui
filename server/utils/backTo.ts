/** Encodes a url as a base64url `backTo` token, safe to concatenate straight into a query string. */
export const encodeBackTo = (url: string): string =>
  btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** Decodes a `backTo` token, returning null unless it holds an internal path. */
export const decodeBackTo = (token: string): string | null => {
  if (!token) return null

  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))

    return decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : null
  } catch {
    return null
  }
}
