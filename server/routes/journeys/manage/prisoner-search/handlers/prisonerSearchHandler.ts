// eslint-disable-next-line max-classes-per-file
import { Request, Response } from 'express'
import { Expose } from 'class-transformer'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'

// TODO: Replace with zod schema for valid entries in the search term
class Body {
  @Expose()
  searchTerm: string
}

export default class PrisonerSearchHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SEARCH_PAGE

  public BODY = Body

  constructor(private readonly prisonerService: PrisonerService) {}

  public GET = async (req: Request, res: Response) => {
    const { searchTerm } = req.session.journey.prisonerSearch || { searchTerm: '' }
    res.render('pages/manage/prisoner-search/prisonerSearch', { searchTerm })
  }

  public POST = async (req: Request, res: Response) => {
    const { body } = req
    req.session.journey.prisonerSearch = {
      searchTerm: body.searchTerm,
    }
    res.redirect('results')
  }
}
