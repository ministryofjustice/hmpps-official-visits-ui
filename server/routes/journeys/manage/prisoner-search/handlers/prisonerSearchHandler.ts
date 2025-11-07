import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import { schema } from './prisonerSearchSchema'

export default class PrisonerSearchHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SEARCH_PAGE

  public BODY = schema

  constructor(private readonly prisonerService: PrisonerService) {}

  public GET = async (req: Request, res: Response) => {
    const { searchTerm } = req.session.journey.prisonerSearch || { searchTerm: '' }
    res.render('pages/manage/prisoner-search/prisonerSearch', { searchTerm, showBreadcrumbs: true })
  }

  public POST = async (req: Request, res: Response) => {
    const { body } = req
    req.session.journey.prisonerSearch = {
      searchTerm: body.searchTerm,
    }
    res.redirect('results')
  }
}
