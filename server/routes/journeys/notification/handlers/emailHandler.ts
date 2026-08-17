import { Request, Response } from 'express'
import { SessionData } from 'express-session'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import { schemaFactory, SchemaType } from './emailSchema'
import OfficialVisitsService from '../../../../services/officialVisitsService'

export default class EmailHandler implements PageHandler {
  public PAGE_NAME = Page.NOTIFICATION_ENTER_EMAIL_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public BODY = schemaFactory

  GET = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const { user } = res.locals

    const session = req.session as SessionData
    let emailAddress =
      res.locals['formResponses']?.emailAddress || session.notifications?.[ovId as string]?.emailAddress

    if (!emailAddress) {
      const notifications = await this.officialVisitsService.getNotificationsByOfficialVisitId(Number(ovId), user)
      emailAddress = notifications?.[0]?.emailAddress
    }

    return res.render('pages/notification/email', {
      formResponses: { emailAddress },
      backUrl: '/',
      ovId,
      action,
    })
  }

  POST = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const { emailAddress } = req.body as SchemaType

    const session = req.session as SessionData
    if (!session.notifications) session.notifications = {}
    const existingNotification = session.notifications[ovId as string] || {}

    session.notifications[ovId as string] = {
      ...existingNotification,
      emailAddress,
      entity: existingNotification.entity || { action },
      createdAt: existingNotification.createdAt || Date.now(),
    }

    return res.redirect(`/notification/add-video-link/${ovId}/${action}`)
  }
}
