import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import TelemetryService from '../../../../../services/telemetryService'

export default class ConfirmationHandler implements PageHandler {
  public PAGE_NAME = Page.CONFIRM_VISIT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
    private readonly telemetryService: TelemetryService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const prisonCode = req.session.activeCaseLoadId
    const { officialVisitId } = req.params
    const visit = await this.officialVisitsService.getOfficialVisitById(
      prisonCode,
      Number(officialVisitId),
      res.locals.user,
    )
    const prisoner = await this.prisonerService.getPrisonerByPrisonerNumber(
      visit.prisonerVisited.prisonerNumber,
      res.locals.user,
    )
    req.session.journey.journeyCompleted = true
    req.session.journey.officialVisit = undefined

    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_CONFIRMATION', user, {
      officialVisitId,
      prisonCode,
    })
    res.render('pages/manage/confirmVisit', { visit, prisoner, officialVisitId })
  }
}
