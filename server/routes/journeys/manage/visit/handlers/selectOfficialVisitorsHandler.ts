import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'

export default class SelectOfficialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_OFFICIAL_VISITORS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    res.render('pages/manage/selectOfficialVisitors', {
      backUrl: `review-scheduled-events`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (_req: Request, res: Response) => {
    return res.redirect(`select-social-visitors`)
  }
}
