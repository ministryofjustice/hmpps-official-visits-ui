import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'

export default class AccessibilityStatementHandler implements PageHandler {
  public PAGE_NAME = Page.ACCESSIBILITY_STATEMENT_PAGE

  GET = async (_req: Request, res: Response) => res.render('pages/help/accessibilityStatement')
}
