import { z } from 'zod'
import { createSchema } from '../../../../../middleware/validationMiddleware'

const ERROR_MSG = 'Enter at least 2 characters to search for matching names'

export const schema = createSchema({
  searchTerm: z.string({ message: ERROR_MSG }).min(2, { message: ERROR_MSG }),
})

export type SchemaType = z.infer<typeof schema>
