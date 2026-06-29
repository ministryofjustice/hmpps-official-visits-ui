import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../../../middleware/validationMiddleware'
import { ContactRelationship } from '../../../../../@types/officialVisitsApi/types'

const ERROR_MAX = 'Information about assistance must be 240 characters or less'

export const schema = async (req: Request) => {
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
    .transform(({ visitorDetails }) => {
      const contacts = [
        ...(req.session.journey.officialVisit.socialVisitors || []),
        ...(req.session.journey.officialVisit.officialVisitors || []),
      ]

      return contacts
        .map(contact => {
          const formContact = visitorDetails.find(o => Number(o.id) === contact.contactId)
          return {
            contactId: contact.contactId,
            assistanceNotes: formContact?.notes,
            // Only contacts that need assistance appear on this page
            present: !!formContact,
          } as ContactRelationship & { present: boolean }
        })
        .filter(o => o.present)
    })
}

export type SchemaType = z.infer<Awaited<ReturnType<typeof schema>>>
