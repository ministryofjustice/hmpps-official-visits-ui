import z from 'zod'
import { Request, Response } from 'express'
import { createSchema } from '../../../../middleware/validationMiddleware'

const EMAIL_EMPTY = 'Enter an email address'
const EMAIL_INVALID = 'Enter an email address in the correct format'

/*
 * The MOJ "add another" component posts one input per item, named
 * emailAddresses[0], emailAddresses[1] and so on, which qs parses into an array.
 * A form with a single item still posts a one-element array, but coerce anyway so
 * a hand-crafted request cannot bypass validation with a bare string.
 */
const toArray = (value: unknown) => {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null) return []
  return [value]
}

export const schemaFactory = async (_req: Request, _res: Response) =>
  createSchema({
    emailAddresses: z.preprocess(toArray, z.array(z.string().optional())),
  })
    .superRefine(({ emailAddresses }, ctx) => {
      // deepTrim in validationMiddleware has already turned blank inputs into undefined
      const addresses = Array.isArray(emailAddresses) ? emailAddresses : []

      if (addresses.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['emailAddresses', 0], message: EMAIL_EMPTY })
        return
      }

      const anyAddressEntered = addresses.some(address => address)

      addresses.forEach((address, index) => {
        if (!address) {
          // When every box is empty, only ask for the first one rather than
          // repeating the same error against each item.
          if (!anyAddressEntered && index > 0) return

          ctx.addIssue({ code: 'custom', path: ['emailAddresses', index], message: EMAIL_EMPTY })
        } else if (!z.email().safeParse(address).success) {
          ctx.addIssue({ code: 'custom', path: ['emailAddresses', index], message: EMAIL_INVALID })
        }
      })
    })
    .transform(({ emailAddresses }) => ({
      emailAddresses: (emailAddresses ?? []).filter((address): address is string => !!address),
    }))

export type SchemaType = z.infer<Awaited<ReturnType<typeof schemaFactory>>>
