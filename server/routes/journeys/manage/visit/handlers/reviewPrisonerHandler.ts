import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'

export default class ReviewPrisonerHandler implements PageHandler {
  public PAGE_NAME = Page.REVIEW_PRISONER_PAGE

  constructor() {}

  public GET = async (req: Request, res: Response) => {
    res.render('pages/manage/reviewPrisoner', {
      backUrl: `results?page=${req.session.journey.officialVisit.searchPage || '0'}`,
      attendees: [req.session.journey.officialVisit.prisoner],
      prisoner: req.session.journey.officialVisit.prisoner,
      showBreadcrumbs: true,
    })
  }
}
