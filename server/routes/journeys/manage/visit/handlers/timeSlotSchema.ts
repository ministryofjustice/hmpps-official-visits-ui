import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../../../middleware/validationMiddleware'

const ERROR_MSG = 'Select a date and time for the official visit'

export const schema = async (req: Request) => {
  return createSchema({
    visitSlot: z.string({ message: ERROR_MSG }),
  }).transform((arg, ctx) => {
    const availableSlots = req.session.journey.officialVisit?.availableSlots || []
    const foundSlot = availableSlots.find(o => o.visitSlotId === Number(arg.visitSlot))
    if (foundSlot) {
      return foundSlot
    }
    ctx.addIssue({
      code: 'custom',
      message: ERROR_MSG,
      path: ['visitSlot'],
      validation: 'visitSlot',
    })
    return z.NEVER
  })
}

export type SchemaType = z.infer<typeof schema>
