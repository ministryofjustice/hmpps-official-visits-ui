import { Request, Response } from 'express'
import { SessionData } from 'express-session'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import { schemaFactory, SchemaType } from './emailSchema'

export default class EmailHandler implements PageHandler {
  public PAGE_NAME = Page.NOTIFICATION_ENTER_EMAIL_PAGE

  public BODY = schemaFactory

  GET = async (req: Request, res: Response) => {
    const { ovId, action } = req.params

    const session = req.session as SessionData
    const emailAddress =
      res.locals['formResponses']?.emailAddress || session.notifications?.[ovId as string]?.emailAddress

    return res.render('pages/notification/email', {
      formResponses: { emailAddress },
      back: '/',
      ovId,
      action,
    })
  }

  POST = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const { emailAddress } = req.body as SchemaType

    const session = req.session as SessionData
    if (!session.notifications) session.notifications = {}
    const actionValue = Array.isArray(action) ? action[0] : action
    session.notifications[ovId as string] = {
      emailAddress,
      entity: { action: actionValue },
      createdAt: Date.now(),
    }

    return res.redirect(`/notification/${ovId}/${action}/check`)
  }
}
