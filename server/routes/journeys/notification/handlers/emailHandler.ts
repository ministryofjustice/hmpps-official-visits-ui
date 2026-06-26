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
    session.notifications[ovId as string] = {
      emailAddress,
      entity: { action },
      createdAt: Date.now(),
    }

    return res.redirect(`/notification/check-email/${ovId}/${action}`)
  }
}
