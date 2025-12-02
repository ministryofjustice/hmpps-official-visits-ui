import { z } from 'zod'
import { Request, Response } from 'express'
import { createSchema, fromRefData } from '../../../../../middleware/validationMiddleware'
import OfficialVisitsService from '../../../../../services/officialVisitsService'

const ERROR_MSG = 'Select a type of official visit'

export const schemaFactory = (officialVisitsService: OfficialVisitsService) => async (_req: Request, res: Response) => {
  const visitTypes = await officialVisitsService.getReferenceData(res, 'VIS_TYPE')
  return createSchema({
    visitType: z.string({ message: ERROR_MSG }).transform(fromRefData(visitTypes, ERROR_MSG)),
  })
}

export type SchemaType = z.infer<Awaited<ReturnType<ReturnType<typeof schemaFactory>>>>
