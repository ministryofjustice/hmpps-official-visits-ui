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
    const notification = session.notifications?.[ovId as string]
    const formResponses = res.locals['formResponses'] as Record<string, unknown> | undefined
    const submitted = formResponses?.['emailAddresses']

    let emailAddresses = Array.isArray(submitted)
      ? submitted.map(address => (typeof address === 'string' ? address : ''))
      : []

    if (!emailAddresses.length) {
      emailAddresses = notification?.emailAddresses ?? []
    }

    if (!emailAddresses.length) {
      const notifications = await this.officialVisitsService.getNotificationsByOfficialVisitId(Number(ovId), user)
      emailAddresses = [...new Set((notifications ?? []).map(sent => sent.emailAddress).filter(Boolean))]
    }

    return res.render('pages/notification/email', {
      formResponses: { emailAddresses: emailAddresses.length ? emailAddresses : [''] },
      backUrl: notification?.reachedCheckAnswers ? `/notification/check-email/${ovId}/${action}` : '/',
      back: '/',
      ovId,
      action,
    })
  }

  POST = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const { emailAddresses } = req.body as SchemaType

    const session = req.session as SessionData
    if (!session.notifications) session.notifications = {}
    const existingNotification = session.notifications[ovId as string] || {}

    session.notifications[ovId as string] = {
      ...existingNotification,
      emailAddresses: [...new Set(emailAddresses)],
      entity: existingNotification.entity || { action },
      createdAt: existingNotification.createdAt || Date.now(),
    }

    return res.redirect(
      existingNotification.reachedCheckAnswers
        ? `/notification/check-email/${ovId}/${action}`
        : `/notification/add-video-link/${ovId}/${action}`,
    )
  }
}
