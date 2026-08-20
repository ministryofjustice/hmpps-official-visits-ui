import { Request, Response } from 'express'
import { SessionData } from 'express-session'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import { schemaFactory, SchemaType } from './emailSchema'
import OfficialVisitsService from '../../../../services/officialVisitsService'

const atLeastOneItem = (addresses: string[]) => (addresses.length > 0 ? addresses : [''])

const distinct = (addresses: string[]) => [...new Set(addresses)]

const normaliseItems = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(address => (typeof address === 'string' ? address : ''))
  if (typeof value === 'string') return [value]
  return []
}

export default class EmailHandler implements PageHandler {
  public PAGE_NAME = Page.NOTIFICATION_ENTER_EMAIL_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public BODY = schemaFactory

  GET = async (req: Request, res: Response) => {
    const { ovId, action } = req.params
    const { user } = res.locals

    const session = req.session as SessionData
    const formResponses = res.locals['formResponses'] as Record<string, unknown> | undefined

    let emailAddresses = normaliseItems(formResponses?.['emailAddresses'])

    if (!emailAddresses.length) {
      emailAddresses = session.notifications?.[ovId as string]?.emailAddresses ?? []
    }

    if (!emailAddresses.length) {
      const notifications = await this.officialVisitsService.getNotificationsByOfficialVisitId(Number(ovId), user)
      emailAddresses = distinct((notifications ?? []).map(notification => notification.emailAddress).filter(Boolean))
    }

    return res.render('pages/notification/email', {
      formResponses: { emailAddresses: atLeastOneItem(emailAddresses) },
      backUrl: '/',
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
      emailAddresses: distinct(emailAddresses),
      entity: existingNotification.entity || { action },
      createdAt: existingNotification.createdAt || Date.now(),
    }

    return res.redirect(`/notification/add-video-link/${ovId}/${action}`)
  }
}
