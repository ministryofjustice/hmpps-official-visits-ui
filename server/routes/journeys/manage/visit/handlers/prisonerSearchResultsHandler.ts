import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import config from '../../../../../config'
import { schema } from './prisonerSearchSchema'
import TelemetryService from '../../../../../services/telemetryService'

export default class PrisonerSearchResultsHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SEARCH_RESULTS_PAGE

  public BODY = schema

  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly telemetryService: TelemetryService,
  ) {}
  public GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId
    const page = Number(req.query.page as unknown) || 0
    const { searchTerm } = req.session.journey.officialVisit

    const results = await this.prisonerService.searchInCaseload(searchTerm, prisonCode, user, {
      page,
      size: config.apis.prisonerSearchApi.pageSize,
    })
    this.telemetryService.trackEvent('OFFICIAL_VISIT_DISPLAY_PRISONER_SEARCH_RESULTS', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    res.render('pages/manage/searchResults', {
      backUrl: 'search',
      backTo: encodeURIComponent(`results?page=${page}`),
      searchTerm,
      results,
      showBreadcrumbs: false,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { body } = req
    req.session.journey.officialVisit ||= {}
    req.session.journey.officialVisit.searchTerm = body.searchTerm
    res.redirect('results')
  }
}
