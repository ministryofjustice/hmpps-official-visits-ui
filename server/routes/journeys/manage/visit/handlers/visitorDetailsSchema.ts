import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../../../middleware/validationMiddleware'
import { ContactRelationship } from '../../../../../@types/officialVisitsApi/types'

const ERROR_MAX = 'Information about assistance must be 240 characters or less'

export const schema = async (_req: Request) => {
  return createSchema({
    visitorDetails: z.array(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
      }),
    ),
  })
    .superRefine(({ visitorDetails }, ctx) => {
      visitorDetails.forEach((contact, index) => {
        if (contact.notes?.length > 240) {
          ctx.addIssue({
            code: 'custom',
            path: ['visitorDetails', index, 'notes'],
            message: ERROR_MAX,
          })
        }
      })
    })
    .transform(({ visitorDetails }) =>
      visitorDetails.map(
        contact =>
          ({
            contactId: Number(contact.id),
            assistanceNotes: contact.notes,
          }) as ContactRelationship,
      ),
    )
}

export type SchemaType = z.infer<Awaited<ReturnType<typeof schema>>>
