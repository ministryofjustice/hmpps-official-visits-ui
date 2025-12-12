import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'

export default class CheckCancelHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_CANCEL_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const officialVisitId = Number(req.params.officialVisitId)
    const { user } = res.locals

    const prisonCode = res.locals.feComponents.sharedData.activeCaseLoad.caseLoadId
    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, officialVisitId, user)
    const prisoner = await this.prisonerService.getPrisonerByPrisonerNumber(visit.prisonerVisited.prisonerNumber, user)

    res.render('pages/manage/checkCancelVisit', { visit, prisoner })
  }
}
