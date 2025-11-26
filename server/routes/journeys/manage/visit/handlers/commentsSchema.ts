import z from 'zod'

const TOO_LONG_ERROR_MSG = 'Extra information must be 400 characters or less'

export const schema = z.object({
  comments: z.string().max(400, TOO_LONG_ERROR_MSG).optional(),
})

export type SchemaType = z.infer<typeof schema>
