import { z } from 'zod'
import { Request } from 'express'
import { createSchema } from '../../../../../middleware/validationMiddleware'
import { ContactRelationship } from '../../../../../@types/officialVisitsApi/types'

export const schema = async (req: Request) => {
  return createSchema({
    assistanceRequired: z.array(
      z.object({
        id: z.string(),
        selected: z.string().optional(),
      }),
    ),
  }).transform(({ assistanceRequired }) => {
    const contacts = [
      ...(req.session.journey.officialVisit.socialVisitors || []),
      ...(req.session.journey.officialVisit.officialVisitors || []),
    ]

    return contacts.map(contact => {
      const formContact = assistanceRequired.find(o => Number(o.id) === contact.contactId)
      return {
        contactId: contact.contactId,
        assistedVisit: !!formContact?.selected,
      } as ContactRelationship
    })
  })
}

export type SchemaType = z.infer<Awaited<ReturnType<typeof schema>>>
