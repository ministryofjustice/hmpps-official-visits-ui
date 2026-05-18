import { z } from 'zod'

const ERROR_LOCATION_REQUIRED = 'Select a location'
const ERROR_NUMBER = 'Enter a valid number'
const ERROR_NEGATIVE = 'Enter a number between 0 and 999'

export const schema = z
  .object({
    dpsLocationId: z.any().optional(),
    maxAdults: z
      .any()
      .optional()
      .transform(v => (v === undefined || v === '' ? undefined : Number(v))),
    maxGroups: z
      .any()
      .optional()
      .transform(v => (v === undefined || v === '' ? undefined : Number(v))),
    maxVideo: z
      .any()
      .optional()
      .transform(v => (v === undefined || v === '' ? undefined : Number(v))),
  })
  .superRefine((data, ctx) => {
    if (data.dpsLocationId === undefined || data.dpsLocationId === null || data.dpsLocationId === '') {
      ctx.addIssue({ code: 'custom', path: ['dpsLocationId'], message: ERROR_LOCATION_REQUIRED })
    }

    const checkNumberField = (field: string) => {
      const val = (data as Record<string, unknown>)[field]
      if (val === undefined || val === null) return
      if (typeof val !== 'number' || !Number.isInteger(val)) {
        ctx.addIssue({ code: 'custom', path: [field], message: ERROR_NUMBER })
        return
      }
      if (val < 0 || val > 999) {
        ctx.addIssue({ code: 'custom', path: [field], message: ERROR_NEGATIVE })
      }
    }

    checkNumberField('maxAdults')
    checkNumberField('maxGroups')
    checkNumberField('maxVideo')
  })

export default schema
