import { isValid } from 'date-fns'
import z from 'zod'
import { createSchema } from '../../../../middleware/validationMiddleware'
import { parseDatePickerDate } from '../../../../utils/utils'
import { getMinDateChecker } from '../../../validators/validateDate'

export const schema = createSchema(
  {
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  },
  false,
)
  .superRefine((data, ctx) => {
    if (data.fromDate && !isValid(parseDatePickerDate(data.fromDate))) {
      ctx.addIssue({ code: 'custom', message: 'From date must be a real date', path: ['fromDate'] })
    }

    if (data.toDate && !isValid(parseDatePickerDate(data.toDate))) {
      ctx.addIssue({ code: 'custom', message: 'To date must be a real date', path: ['toDate'] })
    }
    if (data.fromDate && data.toDate) {
      const fromDate = parseDatePickerDate(data.fromDate)
      const toDate = parseDatePickerDate(data.toDate)

      if (!getMinDateChecker(fromDate)(toDate)) {
        ctx.addIssue({
          code: 'custom',
          message: 'To date must be the same or after the from date',
          path: ['toDate'],
        })
      }
    }
  })
  .transform(data => ({
    fromDate: data.fromDate ? parseDatePickerDate(data.fromDate) : undefined,
    toDate: data.toDate ? parseDatePickerDate(data.toDate) : undefined,
  }))

export type SchemaType = z.infer<typeof schema>
