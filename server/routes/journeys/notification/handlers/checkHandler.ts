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

    // document two user scenarios for the logic below:
    // 1. User enters email and clicks continue - email is in form responses but not session yet
    // 2. User goes back to check page from sent confirmation - email is in session but not form responses
    const formResponsesEmail = res.locals['formResponses']?.emailAddress
    const sessionEmail = req.session?.notifications?.[ovId as string]?.emailAddress
    const emailAddress = formResponsesEmail || sessionEmail

    // Redirect to enter-email page when no valid email is available yet.
    if (!emailAddress) {
      return res.redirect(`/notification/${ovId}/${action}`)
    }

    const visit = await this.officialVisitsService.getOfficialVisitById(Number(ovId), user)
    const contacts = visit?.officialVisitors || []

    return res.render('pages/notification/check', {
      emailAddress,
      visit,
      contacts,
      back: `/notification/${ovId}/${action}`,
      change: `/notification/${ovId}/${action}`,
      ovId,
      action,
    })
  }

  POST = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const emailAddress = req.session.notifications?.[ovId as string]?.emailAddress

    if (!emailAddress) {
      // No email in session - redirect back to enter email
      return res.redirect(`/notification/${ovId}/${action}`)
    }

    const body = {
      'Notification Type': mapActionToNotificationType(action as string),
      emailAddresses: [emailAddress],
    } as NotificationRequest

    await this.officialVisitsService.sendNotification(ovId as string, body, res.locals.user)

    return res.redirect(`/notification/${ovId}/${action}/sent`)
  }
}
