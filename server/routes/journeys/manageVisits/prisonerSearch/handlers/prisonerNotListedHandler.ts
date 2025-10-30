import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'

export default class PrisonerNotListedHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_NOT_LISTED_PAGE

  public GET = async (req: Request, res: Response) => res.render('pages/manageVisits/prisonerSearch/prisonerNotListed')
}
