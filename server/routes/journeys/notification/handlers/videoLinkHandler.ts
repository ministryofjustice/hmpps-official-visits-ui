import { Request, Response } from 'express'
import { SessionData } from 'express-session'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import { schemaFactory, SchemaType } from './videoLinkSchema'

export default class VideoLinkHandler implements PageHandler {
  public PAGE_NAME = Page.NOTIFICATION_VIDEO_LINK_PAGE

  public BODY = schemaFactory

  GET = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const session = req.session as SessionData

    const emailAddress = session.notifications?.[ovId as string]?.emailAddress
    if (!emailAddress) {
      return res.redirect(`/notification/enter-email-address/${ovId}/${action}`)
    }

    const videoLinkUrl =
      res.locals['formResponses']?.videoLinkUrl || session.notifications?.[ovId as string]?.videoLinkUrl

    return res.render('pages/notification/videoLink', {
      formResponses: { videoLinkUrl },
      backUrl: `/notification/enter-email-address/${ovId}/${action}`,
      ovId,
      action,
    })
  }

  POST = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const { videoLinkUrl } = req.body as SchemaType

    const session = req.session as SessionData
    if (!session.notifications?.[ovId as string]?.emailAddress) {
      return res.redirect(`/notification/enter-email-address/${ovId}/${action}`)
    }

    const existingNotification = session.notifications[ovId as string]
    session.notifications[ovId as string] = {
      ...existingNotification,
      videoLinkUrl,
      entity: existingNotification.entity || { action },
      createdAt: existingNotification.createdAt || Date.now(),
    }

    return res.redirect(`/notification/check-email/${ovId}/${action}`)
  }
}
