import z from 'zod'
import { Request, Response } from 'express'
import { createSchema } from '../../../../middleware/validationMiddleware'

const EMAIL_EMPTY = 'Enter an email address'
const EMAIL_INVALID = 'Enter an email address in the correct format'

export const schemaFactory = async (_req: Request, _res: Response) =>
  createSchema({
    emailAddress: z.string({ message: EMAIL_EMPTY }).min(1, EMAIL_EMPTY).email({ message: EMAIL_INVALID }),
  })

export type SchemaType = z.infer<Awaited<ReturnType<typeof schemaFactory>>>
