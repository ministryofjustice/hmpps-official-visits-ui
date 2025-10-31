import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'

export default class PrisonerSearchResultsHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SEARCH_RESULTS_PAGE

  constructor(private readonly prisonerService: PrisonerService) {}

  public GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const page = Number(req.query.page as unknown) || 0

    const { prisonerSearch } = req.session.journey
    const results = await this.prisonerService.searchPrisonersByCriteria(prisonerSearch, { page, size: 10 }, user)

    res.render('pages/manageVisits/prisonerSearch/prisonerSearchResults', { results })
  }
}
