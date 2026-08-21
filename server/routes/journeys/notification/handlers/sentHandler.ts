import { Request, Response } from 'express'
import { SessionData } from 'express-session'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'

export default class SentHandler implements PageHandler {
  public PAGE_NAME = Page.NOTIFICATION_SENT_PAGE

  GET = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const emailAddresses = req.session?.notifications?.[ovId as string]?.emailAddresses ?? []

    if (!emailAddresses.length) {
      return res.redirect(`/notification/enter-email-address/${ovId}/${action}`)
    }

    // clear the session data set using the below code in the check handler
    const session = req.session as SessionData
    session.notifications[ovId as string] = {}
    return res.render('pages/notification/sent', { emailAddresses, action, ovId, back: '/' })
  }
}
