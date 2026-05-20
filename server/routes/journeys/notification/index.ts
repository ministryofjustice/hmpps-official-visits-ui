import { Router } from 'express'
import type { Services } from '../../../services'
import { PageHandler } from '../../interfaces/pageHandler'
import validationMiddleware from '../../../middleware/validationMiddleware'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import EmailHandler from './handlers/emailHandler'
import CheckHandler from './handlers/checkHandler'
import SentHandler from './handlers/sentHandler'

export default function Index({ auditService, officialVisitsService }: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  // Enter email address
  route('/:ovId/:action', new EmailHandler())

  // Check and send
  route('/:ovId/:action/check', new CheckHandler(officialVisitsService))

  // Sent confirmation page (GET only)
  route('/:ovId/:action/sent', new SentHandler())

  return router
}
