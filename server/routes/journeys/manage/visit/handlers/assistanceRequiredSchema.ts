import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../../../middleware/validationMiddleware'
import { ContactRelationship } from '../../../../../@types/officialVisitsApi/types'

const ERROR_MIN = 'Enter information about assistance for this visitor'
const ERROR_MAX = 'Information about assistance must be 240 characters or less'

export const schema = async (req: Request) => {
  return createSchema({
    assistanceRequired: z.array(
      z.object({
        id: z.string().optional(),
        notes: z.string().optional(),
      }),
    ),
  })
    .superRefine(({ assistanceRequired }, ctx) => {
      assistanceRequired.forEach((contact, index) => {
        if (!contact.id) {
          return // No validation needed if the visitor has not been selected
        }

        if (contact.notes?.length > 240) {
          ctx.addIssue({
            code: 'custom',
            path: ['assistanceRequired', index, 'notes'],
            message: ERROR_MAX,
          })
        } else if (!contact.notes) {
          ctx.addIssue({
            code: 'custom',
            path: ['assistanceRequired', index, 'notes'],
            message: ERROR_MIN,
          })
        }
      })
    })
    .transform(({ assistanceRequired }) => {
      const contacts = [
        ...(req.session.journey.officialVisit.socialVisitors || []),
        ...(req.session.journey.officialVisit.officialVisitors || []),
      ]

      return contacts.map(contact => {
        const formContact = assistanceRequired.find(o => Number(o.id) === contact.prisonerContactId)
        return {
          prisonerContactId: contact.prisonerContactId,
          assistanceNotes: formContact?.notes,
          assistedVisit: !!formContact,
        } as ContactRelationship
      })
    })
}

export type SchemaType = z.infer<Awaited<ReturnType<typeof schema>>>
