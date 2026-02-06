import z from 'zod'

const TOO_LONG_ERROR_MSG = 'must be 240 characters or less'

export const schema = z.object({
  staffNotes: z.string().max(240, `Staff notes ${TOO_LONG_ERROR_MSG}`).optional(),
  prisonerNotes: z.string().max(240, `Prisoner notes ${TOO_LONG_ERROR_MSG}`).optional(),
})

export type SchemaType = z.infer<typeof schema>
