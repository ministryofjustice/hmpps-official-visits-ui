import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../../../middleware/validationMiddleware'

const ERROR_MSG = 'Select a date and time for the official visit'

export const schema = async (req: Request) => {
  return createSchema({
    timeSlot: z.string({ message: ERROR_MSG }),
  }).transform((arg, ctx) => {
    const [visitSlotId, timeSlotId] = arg.timeSlot.split('-')
    const foundSlot = req.session.journey.officialVisit.availableSlots.find(
      o => o.timeSlotId === Number(timeSlotId) && o.visitSlotId === Number(visitSlotId),
    )
    if (foundSlot) {
      return foundSlot
    }
    ctx.addIssue({
      code: 'custom',
      message: ERROR_MSG,
      path: ['timeSlot'],
      validation: 'timeSlot',
    })
    return z.NEVER
  })
}

export type SchemaType = z.infer<typeof schema>
