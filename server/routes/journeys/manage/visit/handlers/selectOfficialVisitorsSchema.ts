import { z } from 'zod'
import { createSchema } from '../../../../../middleware/validationMiddleware'

const ERROR_MSG = 'Select at least one official contact'

export const schema = async () => {
  return createSchema({
    selected: z.union([z.string().transform(val => [val]), z.array(z.string())], { message: ERROR_MSG }),
  })
}

export type SchemaType = z.infer<typeof schema>
