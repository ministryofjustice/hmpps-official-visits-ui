// eslint-disable-next-line max-classes-per-file
import { Request, Response } from 'express'
import { Expose } from 'class-transformer'
import { MinLength } from 'class-validator'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'

class Body {
  @Expose()
  @MinLength(2, { message: 'Enter at least $constraint1 characters to search for matching names' })
  searchTerm: string
}

export default class PrisonerSearchHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SEARCH_PAGE

  public BODY = Body

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
