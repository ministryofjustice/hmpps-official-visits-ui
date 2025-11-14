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
  ) {}

  public GET = async (req: Request, res: Response) => {
    const visit = req.session.journey.officialVisit
    const { prisoner } = visit

    req.session.journey.journeyCompleted = true
    req.session.journey.officialVisit = null

    res.render('pages/manage/confirmVisit', { visit, prisoner })

    // const officialVisitId = Number(req.params.officialVisitId)
    // const { user } = res.locals

    // const visit = await this.officialVisitsService.getOfficialVisitById(officialVisitId, user)
    // const prisoner = await this.prisonerService.getPrisonerByPrisonerNumber(visit.prisonerNumber, user)
    // res.render('pages/manage/confirmVisit', { visit, prisoner })
  }
}
