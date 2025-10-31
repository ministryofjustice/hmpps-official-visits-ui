import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'

export default class TimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.CHOOSE_TIME_SLOT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const officialVisitId = Number(req.params.officialVisitId)
    const { user } = res.locals

    const visit = await this.officialVisitsService.getOfficialVisitById(officialVisitId, user)
    const prisoner = await this.prisonerService.getPrisonerByPrisonerNumber(visit.prisonerNumber, user)
    req.session.journey.officialVisit = null

    res.render('pages/manageVisits/chooseTimeSlot', { visit, prisoner })
  }
}
