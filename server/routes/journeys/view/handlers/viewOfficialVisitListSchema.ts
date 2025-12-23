import { z } from 'zod'
import { createSchema } from '../../../../middleware/validationMiddleware'
import { getMinDateChecker, validateDateBase } from '../../../validators/validateDate'

export const schema = createSchema(
  {
    startDate: validateDateBase('Enter a date', 'From date must be a real date'),
    endDate: validateDateBase('Enter a date', 'To date must be a real date'),
  },
  false,
).transform((data, ctx) => {
  if (!getMinDateChecker(data.startDate)(data.endDate)) {
    ctx.addIssue({
      code: 'custom',
      message: 'To date must be after the from date',
      path: ['endDate'],
    })
  }
  return data
})
type SchemaType = z.infer<typeof schema>
export type ResQuerySchemaType = (SchemaType & { validated?: SchemaType }) | undefined
