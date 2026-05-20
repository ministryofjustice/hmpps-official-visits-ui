import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'

export default class SentHandler implements PageHandler {
  public PAGE_NAME = Page.NOTIFICATION_SENT_PAGE

  GET = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const emailAddress =
      res.locals['formResponses']?.emailAddress || req.session?.notifications?.[ovId as string]?.emailAddress

    return res.render('pages/notification/sent', { emailAddress, action, ovId, back: '/' })
  }
}
