import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'

export default class CancellationCheckHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_CANCEL_PAGE

  constructor() {}

  public GET = async (req: Request, res: Response) => {
    res.render('pages/manage/cancellation-check', {
      prisoner: req.session.journey.officialVisit.prisoner,
      // Take them back to the page they came from if available,
      // otherwise attempt check-your-answers to let the state guard deal with
      // bouncing back to the last valid point in the journey
      backTo: req.header('Referer') || 'check-your-answers',
      stepsChecked: req.query.stepsChecked,
    })
  }
}
