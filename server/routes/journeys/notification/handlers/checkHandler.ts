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
    const formResponses = res.locals['formResponses'] as Record<string, unknown> | undefined
    const formResponsesEmails = formResponses?.['emailAddresses']
    const sessionEmails = req.session?.notifications?.[ovId as string]?.emailAddresses
    const formResponsesVideoLinkUrl = res.locals['formResponses']?.videoLinkUrl
    const sessionVideoLinkUrl = req.session?.notifications?.[ovId as string]?.videoLinkUrl
    const emailAddresses = (Array.isArray(formResponsesEmails) ? formResponsesEmails : sessionEmails) ?? []
    const videoLinkUrl = formResponsesVideoLinkUrl || sessionVideoLinkUrl

    if (!emailAddresses.length) {
      return res.redirect(`/notification/enter-email-address/${ovId}/${action}`)
    }

    const visit = await this.officialVisitsService.getOfficialVisitById(Number(ovId), user)
    const isVideoVisit = visit?.visitTypeCode === 'VIDEO'

    if (isVideoVisit && !videoLinkUrl) {
      return res.redirect(`/notification/add-video-link/${ovId}/${action}`)
    }

    const notification = req.session.notifications?.[ovId as string]
    if (notification) notification.reachedCheckAnswers = true

    const contacts = visit?.officialVisitors || []

    return res.render('pages/notification/check', {
      emailAddresses,
      videoLinkUrl: isVideoVisit ? videoLinkUrl : undefined,
      isVideoVisit,
      visit,
      contacts,
      backUrl: isVideoVisit
        ? `/notification/add-video-link/${ovId}/${action}`
        : `/notification/enter-email-address/${ovId}/${action}`,
      back: '/',
      changeEmailAddress: `/notification/enter-email-address/${ovId}/${action}`,
      changeVideoLink: `/notification/add-video-link/${ovId}/${action}`,
      ovId,
      action,
    })
  }

  POST = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const emailAddresses = req.session.notifications?.[ovId as string]?.emailAddresses
    const videoLinkUrl = req.session.notifications?.[ovId as string]?.videoLinkUrl

    if (!emailAddresses?.length) {
      return res.redirect(`/notification/enter-email-address/${ovId}/${action}`)
    }

    const visit = await this.officialVisitsService.getOfficialVisitById(Number(ovId), res.locals.user)
    const isVideoVisit = visit?.visitTypeCode === 'VIDEO'

    if (isVideoVisit && !videoLinkUrl) {
      return res.redirect(`/notification/add-video-link/${ovId}/${action}`)
    }

    const body = {
      notificationType: mapActionToNotificationType(action as string),
      emailAddresses,
      ...(isVideoVisit ? { videoLinkUrl } : {}),
    } as NotificationRequest

    await this.officialVisitsService.sendNotification(ovId as string, body, res.locals.user)

    return res.redirect(`/notification/email-confirmation/${ovId}/${action}`)
  }
}
