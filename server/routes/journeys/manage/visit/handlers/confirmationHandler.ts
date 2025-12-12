import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'

export default class ConfirmationHandler implements PageHandler {
  public PAGE_NAME = Page.CONFIRM_VISIT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
  ) { }

  public GET = async (req: Request, res: Response) => {
    const visit = await this.officialVisitsService.getOfficialVisitById(req.session.journey.officialVisit.prisonCode, Number(req.params.officialVisitId), res.locals.user)
    const prisoner = await this.prisonerService.getPrisonerByPrisonerNumber(visit.prisonerNumber, res.locals.user)

    req.session.journey.journeyCompleted = true
    req.session.journey.officialVisit = {
      // Persisting prisonCode for now
      prisonCode: req.session.journey.officialVisit.prisonCode,
    }

    res.render('pages/manage/confirmVisit', { visit, prisoner })
  }
}
