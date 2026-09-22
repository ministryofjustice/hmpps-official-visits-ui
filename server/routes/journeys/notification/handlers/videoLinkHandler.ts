import { Request, Response } from 'express'
import { SessionData } from 'express-session'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import { schemaFactory, SchemaType } from './videoLinkSchema'
import OfficialVisitsService from '../../../../services/officialVisitsService'

export default class VideoLinkHandler implements PageHandler {
  public PAGE_NAME = Page.NOTIFICATION_VIDEO_LINK_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public BODY = schemaFactory

  private async isVideoVisit(ovId: string, res: Response) {
    const visit = await this.officialVisitsService.getOfficialVisitById(Number(ovId), res.locals.user)
    return visit?.visitTypeCode === 'VIDEO'
  }

  GET = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const session = req.session as SessionData

    const notification = session.notifications?.[ovId as string]
    if (!notification?.emailAddresses?.length) {
      return res.redirect(`/notification/enter-email-address/${ovId}/${action}`)
    }

    if (!(await this.isVideoVisit(ovId as string, res))) {
      return res.redirect(`/notification/check-email/${ovId}/${action}`)
    }

    const videoLinkUrl = res.locals['formResponses']?.videoLinkUrl || notification.videoLinkUrl

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
    const existingNotification = session.notifications?.[ovId as string]
    if (!existingNotification?.emailAddresses?.length) {
      return res.redirect(`/notification/enter-email-address/${ovId}/${action}`)
    }

    if (!(await this.isVideoVisit(ovId as string, res))) {
      return res.redirect(`/notification/check-email/${ovId}/${action}`)
    }

    session.notifications[ovId as string] = {
      ...existingNotification,
      videoLinkUrl,
      entity: existingNotification.entity || { action },
      createdAt: existingNotification.createdAt || Date.now(),
    }

    return res.redirect(`/notification/check-email/${ovId}/${action}`)
  }
}
