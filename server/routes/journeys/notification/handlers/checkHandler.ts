import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { NotificationRequest } from '../../../../@types/officialVisitsApi/types'

const mapActionToNotificationType = (action: string) => {
  switch (action) {
    case 'create':
      return 'CREATE'
    case 'edit':
      return 'AMEND'
    case 'cancel':
      return 'CANCEL'
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

export default class CheckHandler implements PageHandler {
  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public PAGE_NAME = Page.NOTIFICATION_CHECK_PAGE

  GET = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const { user } = res.locals

    // Support both values when coming from validation redirects (formResponses)
    // and when returning to check from later in the journey (session data).
    const formResponsesEmail = res.locals['formResponses']?.emailAddress
    const sessionEmail = req.session?.notifications?.[ovId as string]?.emailAddress
    const formResponsesVideoLinkUrl = res.locals['formResponses']?.videoLinkUrl
    const sessionVideoLinkUrl = req.session?.notifications?.[ovId as string]?.videoLinkUrl
    const emailAddress = formResponsesEmail || sessionEmail
    const videoLinkUrl = formResponsesVideoLinkUrl || sessionVideoLinkUrl

    if (!emailAddress) {
      return res.redirect(`/notification/enter-email-address/${ovId}/${action}`)
    }

    if (!videoLinkUrl) {
      return res.redirect(`/notification/add-video-link/${ovId}/${action}`)
    }

    const visit = await this.officialVisitsService.getOfficialVisitById(Number(ovId), user)
    const contacts = visit?.officialVisitors || []

    return res.render('pages/notification/check', {
      emailAddress,
      videoLinkUrl,
      visit,
      contacts,
      backUrl: `/notification/add-video-link/${ovId}/${action}`,
      back: '/',
      changeEmailAddress: `/notification/enter-email-address/${ovId}/${action}`,
      changeVideoLink: `/notification/add-video-link/${ovId}/${action}`,
      ovId,
      action,
    })
  }

  POST = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const emailAddress = req.session.notifications?.[ovId as string]?.emailAddress
    const videoLinkUrl = req.session.notifications?.[ovId as string]?.videoLinkUrl

    if (!emailAddress) {
      return res.redirect(`/notification/enter-email-address/${ovId}/${action}`)
    }

    if (!videoLinkUrl) {
      return res.redirect(`/notification/add-video-link/${ovId}/${action}`)
    }

    const body = {
      notificationType: mapActionToNotificationType(action as string),
      emailAddresses: [emailAddress],
      videoLinkUrl,
    } as NotificationRequest

    await this.officialVisitsService.sendNotification(ovId as string, body, res.locals.user)

    return res.redirect(`/notification/email-confirmation/${ovId}/${action}`)
  }
}
