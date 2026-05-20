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
      return 'CREATE'
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
    const emailAddress =
      res.locals['formResponses']?.emailAddress || req.session?.notifications?.[ovId as string]?.emailAddress

    const prisonCode = req.session.activeCaseLoadId
    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(ovId), user)
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
    const prisonId = req.session.activeCaseLoadId

    if (!emailAddress) {
      // No email in session - redirect back to enter email
      return res.redirect(`/notification/${ovId}/${action}`)
    }

    const body = {
      notificationType: mapActionToNotificationType(action as string),
      emailAddresses: [emailAddress],
    } as NotificationRequest

    await this.officialVisitsService.sendNotification(prisonId, ovId as string, body, res.locals.user)

    return res.redirect(`/notification/${ovId}/${action}/sent`)
  }
}
