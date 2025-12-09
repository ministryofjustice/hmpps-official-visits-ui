import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../../../middleware/validationMiddleware'
import { ContactRelationship } from '../../../../../@types/officialVisitsApi/types'

const ERROR_MIN = 'Enter information about equipment for this visitor'
const ERROR_MAX = 'Information about equipment must be 400 characters or less'

export const schema = async (req: Request) => {
  return createSchema({
    equipment: z.array(
      z.object({
        id: z.string().optional(),
        notes: z.string().optional(),
      }),
    ),
  })
    .superRefine(({ equipment }, ctx) => {
      equipment.forEach((contact, index) => {
        if (!contact.id) {
          return // No validation needed if the visitor has not been selected
        }

        if (contact.notes?.length > 400) {
          ctx.addIssue({
            code: 'custom',
            path: ['equipment', index, 'notes'],
            message: ERROR_MAX,
          })
        } else if (!contact.notes) {
          ctx.addIssue({
            code: 'custom',
            path: ['equipment', index, 'notes'],
            message: ERROR_MIN,
          })
        }
      })
    })
    .transform(({ equipment }) => {
      const contacts = [
        ...(req.session.journey.officialVisit.socialVisitors || []),
        ...(req.session.journey.officialVisit.officialVisitors || []),
      ]

      return contacts.map(contact => {
        const formContact = equipment.find(o => Number(o.id) === contact.prisonerContactId)
        return {
          prisonerContactId: contact.prisonerContactId,
          equipmentNotes: formContact?.notes,
          equipment: !!formContact,
        } as ContactRelationship
      })
    })
}

export type SchemaType = z.infer<Awaited<ReturnType<typeof schema>>>
