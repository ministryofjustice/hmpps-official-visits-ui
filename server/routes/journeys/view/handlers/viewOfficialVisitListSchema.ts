import { z } from 'zod'
import { createSchema } from '../../../../middleware/validationMiddleware'
import { getMinDateChecker, validateDateOptional } from '../../../validators/validateDate'

const toDateString = (date: Date) =>
  date
    .toISOString()
    .substring(0, 10)
    .split('-')
    .map(o => o.padStart(2, '0'))
    .join('-')

export const schema = createSchema(
  {
    startDate: validateDateOptional('From date must be a real date'),
    endDate: validateDateOptional('To date must be a real date'),
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
  return {
    ...data,
    startDate: data.startDate ? toDateString(data.startDate) : undefined,
    endDate: data.endDate ? toDateString(data.endDate) : undefined,
  }
})
type SchemaType = z.infer<typeof schema>
export type ResQuerySchemaType = (SchemaType & { validated?: SchemaType }) | undefined
