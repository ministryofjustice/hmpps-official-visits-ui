import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../../../middleware/validationMiddleware'
import { Contact } from '../../../../../@types/officialVisitsApi/types'

export const schema = async (req: Request) => {
  return createSchema({
    assistanceRequired: z.array(
      z.object({
        id: z.string(),
        notes: z.string().max(400, { error: 'Notes must be 400 characters or less' }).optional(),
      }),
    ),
  }).transform(({ assistanceRequired }, ctx) => {
    const contacts = [
      ...(req.session.journey.officialVisit.socialVisitors || []),
      ...(req.session.journey.officialVisit.officialVisitors || []),
    ]

    return contacts.map(contact => {
      const formContact = assistanceRequired.find(o => Number(o.id) === contact.contactId)
      return {
        contactId: contact.contactId,
        assistanceNotes: formContact?.notes,
        assistedVisit: !!formContact,
      } as Contact
    })
  })
}

export type SchemaType = z.infer<typeof schema>
