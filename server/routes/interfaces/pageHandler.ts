import { NextFunction, Request, Response } from 'express'
import z from 'zod'
import { Page } from '../../services/auditService'
import { SchemaFactory } from '../../middleware/validationMiddleware'

export interface PageHandler {
  PAGE_NAME: Page
  GET(req: Request, res: Response, next?: NextFunction): Promise<void>
  POST?(req: Request, res: Response, next?: NextFunction): Promise<void>
  SCHEMA?: z.ZodTypeAny | SchemaFactory
}
