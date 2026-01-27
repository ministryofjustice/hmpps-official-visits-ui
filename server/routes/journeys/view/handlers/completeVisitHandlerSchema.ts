import z from 'zod'
import { Response, Request } from 'express'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { createSchema, fromRefData } from '../../../../middleware/validationMiddleware'

const REASON_MSG = 'Select a completion reason'
const SEARCH_MSG = 'Select a search type'

export const schemaFactory = (officialVisitsService: OfficialVisitsService) => async (_req: Request, res: Response) => {
  const searchTypes = await officialVisitsService.getReferenceData(res, 'SEARCH_LEVEL')
  return createSchema({
    reason: z.string({ message: REASON_MSG }).refine(val => val && val.trim().length > 0, REASON_MSG),
    attendance: z.array(
      z.object({
        id: z.string().optional(),
        searchType: z.string({ message: SEARCH_MSG }).transform(fromRefData(searchTypes, SEARCH_MSG)),
      }),
    ),
  }).superRefine(({ attendance }, ctx) => {
    attendance.forEach((contact, index) => {
      if (!contact.id) {
        return // No validation needed if the visitor has not been selected
      }

      if (!contact.searchType || !searchTypes.find(o => o.code === contact.searchType)) {
        ctx.addIssue({
          code: 'custom',
          path: ['attendance', index, 'searchType'],
          message: SEARCH_MSG,
        })
      }
    })
  })
}

export type SchemaType = z.infer<Awaited<ReturnType<ReturnType<typeof schemaFactory>>>>
