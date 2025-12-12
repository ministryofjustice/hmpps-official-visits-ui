import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'

export default class ConfirmCancelledHandler implements PageHandler {
  public PAGE_NAME = Page.CONFIRM_CANCEL_VISIT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const officialVisitId = Number(req.params.officialVisitId)
    const { user } = res.locals

    // TODO: Fill in the proper details and checks here
    const prisonCode = res.locals.feComponents.sharedData.activeCaseLoad.caseLoadId
    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, officialVisitId, user)
    req.session.journey.officialVisit = null

    res.render('pages/manage/confirmCancel', { visit })
  }
}
