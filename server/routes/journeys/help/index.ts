import { Router } from 'express'
import type { Services } from '../../../services'
import AccessibilityStatementHandler from './handlers/accessibilityStatementHandler'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'

export default function Index({ auditService }: Services): Router {
  const router = Router({ mergeParams: true })

  const handler = new AccessibilityStatementHandler()
  router.get('/accessibility-statement', logPageViewMiddleware(auditService, handler), handler.GET)

  return router
}
