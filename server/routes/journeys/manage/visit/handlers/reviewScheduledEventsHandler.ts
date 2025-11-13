import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'

export default class ReviewScheduledEventsHandler implements PageHandler {
  public PAGE_NAME = Page.REVIEW_SCHEDULED_EVENTS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    res.render('pages/manage/reviewScheduledEvents', {
      backUrl: `time-slot`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (_req: Request, res: Response) => {
    return res.redirect(`select-official-visitors`)
  }
}
