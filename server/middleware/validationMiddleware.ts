import { RequestHandler, Request, Response } from 'express'
import z, { RefinementCtx } from 'zod'
import { $ZodSuperRefineIssue } from 'zod/v4/core'
import { ReferenceDataItem } from '../@types/officialVisitsApi/types'

export const fromRefData = (refData: ReferenceDataItem[], errorMessage: string) => {
  return (val: string, ctx: RefinementCtx) => {
    const item = refData.find(o => o.code === val)
    if (!item) {
      ctx.addIssue({ code: 'custom', message: errorMessage })
      return z.NEVER
    }
    return item.code
  }
}

export type SchemaFactory = (request: Request, res: Response) => Promise<z.ZodTypeAny>

export const createSchema = <T = object>(shape: T, strict = true) =>
  zodAlwaysRefine(strict ? zObjectStrict(shape) : z.looseObject(shape))

const zObjectStrict = <T = object>(shape: T) => z.object({ _csrf: z.string().optional(), ...shape }).strict()

/*
 * Ensure that all parts of the schema get tried and can fail before exiting schema checks - this ensures we don't have to
 * have complicated schemas if we want to both ensure the order of fields and have all the schema validation run
 * more info regarding this issue and workaround on: https://github.com/colinhacks/zod/issues/479#issuecomment-2067278879
 */
const zodAlwaysRefine = <T extends z.ZodTypeAny>(zodType: T) =>
  z.any().transform((val, ctx) => {
    const res = zodType.safeParse(val)
    if (!res.success) res.error.issues.forEach(issue => ctx.addIssue(issue as $ZodSuperRefineIssue))
    return res.data || val
  }) as unknown as T

const normaliseNewLines = (body: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/\r\n/g, '\n') : v]),
  )
}

const pathArrayToString = (previous: string | number | symbol, next: string | number | symbol): string => {
  if (!previous) {
    return next.toString()
  }
  return `${String(previous)}[${next.toString()}]`
}

export function validateOnGET(schema: z.ZodTypeAny | SchemaFactory, ...queryProps: string[]): RequestHandler {
  return async (req, res, next) => {
    if (queryProps.some(prop => prop === '*' || Object.hasOwn(req.query, prop))) {
      const resolvedSchema = typeof schema === 'function' ? await schema(req, res) : schema
      const result = await resolvedSchema.safeParseAsync(normaliseNewLines(req.query))
      req.rawBody = req.query
      if (!result.success) {
        res.locals['validationErrors'] = result.error
        result.error?.issues?.forEach(key => {
          res.addValidationError(key.message, key.path.reduce(pathArrayToString) as string)
        })

        return res.validationFailed()
      }
    }
    return next()
  }
}

/**
 * On POST requests this middleware will iterate over the object provided in the request body
 * and construct an object, of a provided type, which can then be validated against annotated
 * rules of that class.
 *
 * On failure, the middleware redirects to a GET on the same page.
 * On success, the middleware calls next()
 *
 * @param type The class of the object to construct and validate against
 */

export default function validationMiddleware(schema: z.ZodTypeAny | SchemaFactory): RequestHandler {
  // Recursively iterate into an object and trim any strings inside
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deepTrim = (object: any): object => {
    const o = object
    if (o) {
      Object.keys(o).forEach(key => {
        if (typeof o[key] === 'string') {
          o[key] = o[key].trim() || undefined
        } else if (typeof o[key] === 'object') {
          o[key] = deepTrim(o[key])
        }
      })
    }
    return o as object
  }

  return async (req, res, next) => {
    req.rawBody = req.body
    req.body = deepTrim(req.body)

    if (!schema) {
      return next()
    }

    const resolvedSchema = typeof schema === 'function' ? await schema(req, res) : schema
    const result = await resolvedSchema.safeParseAsync(normaliseNewLines(req.body))
    if (result.success) {
      req.body = result.data
      return next()
    }

    result.error.issues.forEach(key => {
      res.addValidationError(key.message, key.path.reduce(pathArrayToString) as string)
    })

    return res.validationFailed()
  }
}
