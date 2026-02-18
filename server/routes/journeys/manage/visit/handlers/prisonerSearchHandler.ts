import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema } from './prisonerSearchSchema'
import TelemetryService from '../../../../../services/telemetryService'

export default class PrisonerSearchHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SEARCH_PAGE

  public BODY = schema

  constructor(private readonly telemetryService: TelemetryService) {}

  public GET = async (req: Request, res: Response) => {
    req.session.journey.officialVisit ??= { searchTerm: '' }
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_ACCESS_PRISONER_SEARCH', user, {})
    res.render('pages/manage/prisonerSearch', {
      backUrl: '/',
      searchTerm: req.session.journey.officialVisit.searchTerm,
      showBreadcrumbs: false,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { body } = req
    req.session.journey.officialVisit ||= {}
    req.session.journey.officialVisit.searchTerm = body.searchTerm
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_PERFORM_PRISONER_SEARCH', user, {
      searchTerm: body.searchTerm,
    })
    res.redirect('results')
  }
}
