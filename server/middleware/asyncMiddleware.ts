import type { Request, Response, NextFunction, RequestHandler } from 'express'

export default function asyncMiddleware<T, ResBody, ReqBody, Q>(fn: RequestHandler<T, ResBody, ReqBody, Q>) {
  return (req: Request<T, ResBody, ReqBody, Q>, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
