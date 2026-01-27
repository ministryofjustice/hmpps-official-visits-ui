import z from 'zod'

const MSG = 'Select a cancellation reason'

export const schema = z.object({
  reason: z.string({ message: MSG }).refine(val => val && val.trim().length > 0, MSG),
})

export type SchemaType = z.infer<typeof schema>
