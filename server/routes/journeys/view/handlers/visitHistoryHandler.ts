import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import TelemetryService from '../../../../services/telemetryService'
import { AuditedEvent, OfficialVisitNotifications } from '../../../../@types/officialVisitsApi/types'
import { convertToTitleCase } from '../../../../utils/utils'
import ManageUserService from '../../../../services/manageUsersService'
import { HmppsUser } from '../../../../interfaces/hmppsUser'

type TimelineItem = {
  label: { text: string }
  text?: string
  datetime: {
    timestamp: string
    type: 'datetime'
  }
  byline: { text: string }
}

type TimelineItemWithSort = TimelineItem & {
  sortTimestamp: number
}

const DEFAULT_TIMESTAMP = '1970-01-01T00:00:00.000Z'
const DEFAULT_ACTIVITY_LABEL = 'Activity updated'
const DEFAULT_USER_LABEL = 'System'
const DEFAULT_FIELD_LABEL = 'Field'
const NOT_PROVIDED = 'Not provided'

const FIELD_LABELS: Record<string, string> = {
  visitor_added: 'Visitor added',
  visitor_updated: 'Visitor updated',
  visitor_removed: 'Visitor removed',
}

type ChangeSemantics = 'added' | 'removed' | 'updated'

type ApiNotificationStatus =
  'PENDING' | 'SENT' | 'PERMANENT_FAILURE' | 'TEMPORARY_FAILURE' | 'TECHNICAL_FAILURE' | 'UNKNOWN'

type UserNotificationStatus = 'PENDING' | 'SENT' | 'FAILURE'

const API_TO_USER_STATUS: Record<ApiNotificationStatus, UserNotificationStatus> = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  PERMANENT_FAILURE: 'FAILURE',
  TEMPORARY_FAILURE: 'FAILURE',
  TECHNICAL_FAILURE: 'FAILURE',
  UNKNOWN: 'FAILURE',
}

const NOTIFICATION_STATUS_DISPLAY: Record<UserNotificationStatus, { label: string; value: string }> = {
  PENDING: { label: 'Email notification pending', value: 'Pending' },
  SENT: { label: 'Email notification sent', value: 'Sent' },
  FAILURE: { label: 'Email notification failed', value: 'Failed' },
}

type NotificationReasonTypes =
  'OFFICIAL_VISIT_CANCELLED' | 'OFFICIAL_VISIT_CREATED' | 'OFFICIAL_VISIT_UPDATED' | 'UNKNOWN'

const NOTIFICATION_REASON_LABELS: Record<NotificationReasonTypes, string> = {
  OFFICIAL_VISIT_CANCELLED: 'Email notification for cancelled visit',
  OFFICIAL_VISIT_CREATED: 'Email notification for created visit',
  OFFICIAL_VISIT_UPDATED: 'Email notification for updated visit',
  UNKNOWN: NOT_PROVIDED,
}

const FIELD_SEMANTICS: Record<string, ChangeSemantics> = {
  visitor_added: 'added',
  visitor_updated: 'updated',
  visitor_removed: 'removed',
}

const isApiNotificationStatus = (value: string): value is ApiNotificationStatus => value in API_TO_USER_STATUS

const isNotificationReason = (value: string): value is NotificationReasonTypes => value in NOTIFICATION_REASON_LABELS

const normalizeText = (value?: string | null): string | undefined => {
  const trimmed = value?.trim()
  return trimmed || undefined
}

const withFallback = (value: string | undefined, fallback: string): string => value ?? fallback

const getTimestamp = (value?: string | null): string => withFallback(normalizeText(value), DEFAULT_TIMESTAMP)

const toTimestampMillis = (isoTimestamp: string): number => {
  const parsed = Date.parse(isoTimestamp)
  return Number.isNaN(parsed) ? 0 : parsed
}

const resolveNotificationStatus = (status?: string | null): UserNotificationStatus => {
  const normalized = normalizeText(status)?.toUpperCase()
  return normalized && isApiNotificationStatus(normalized) ? API_TO_USER_STATUS[normalized] : 'FAILURE'
}

const resolveNotificationReason = (reason?: string | null): NotificationReasonTypes => {
  const normalized = normalizeText(reason)?.toUpperCase()
  return normalized && isNotificationReason(normalized) ? normalized : 'UNKNOWN'
}

const formatFieldName = (field: string): string => {
  const normalizedField = normalizeText(field)?.toLowerCase()
  if (!normalizedField) return DEFAULT_FIELD_LABEL

  const fallbackLabel = convertToTitleCase(normalizedField.replace(/[_-]+/g, ' '))

  return FIELD_LABELS[normalizedField] ?? (fallbackLabel || DEFAULT_FIELD_LABEL)
}

const formatChange = (field: string, oldValue?: string | null, newValue?: string | null): string => {
  const fieldName = formatFieldName(field)
  const previousValue = normalizeText(oldValue)
  const updatedValue = normalizeText(newValue)
  const semantics = FIELD_SEMANTICS[normalizeText(field)?.toLowerCase() ?? '']

  if (previousValue && updatedValue) return `${fieldName} changed from ${previousValue} to ${updatedValue}`
  if (semantics === 'added' && updatedValue) return fieldName
  if (updatedValue) return `${fieldName} set to ${updatedValue}`
  if (semantics === 'removed' && previousValue) return fieldName
  if (previousValue) return `${fieldName} removed`
  return fieldName
}

const toTimelineItem = (event: AuditedEvent): TimelineItemWithSort => {
  const timestamp = getTimestamp(event.eventDateTime)

  return {
    label: {
      text: withFallback(normalizeText(event.eventSummary), DEFAULT_ACTIVITY_LABEL),
    },
    text: (event.eventChanges ?? [])
      .map(change => formatChange(change.field, change.oldValue, change.newValue))
      .join('\n'),
    datetime: {
      timestamp,
      type: 'datetime',
    },
    byline: {
      text: withFallback(
        normalizeText(event.eventUserFullName) ?? normalizeText(event.eventUsername),
        DEFAULT_USER_LABEL,
      ),
    },
    sortTimestamp: toTimestampMillis(timestamp),
  }
}

const toNotificationTimelineItem = ({
  notification,
  creatorName,
}: {
  notification: OfficialVisitNotifications[number]
  creatorName: string
}): TimelineItemWithSort => {
  const status = resolveNotificationStatus(notification.emailStatus)
  const timestamp = getTimestamp(notification.statusUpdatedTime ?? notification.createdTime)
  const emailAddress = normalizeText(notification.emailAddress)
  const reason = resolveNotificationReason(notification.reason)
  const { label, value } = NOTIFICATION_STATUS_DISPLAY[status]

  return {
    label: {
      text: label,
    },
    text: [
      `Email address: ${emailAddress ?? NOT_PROVIDED}`,
      `Reason: ${NOTIFICATION_REASON_LABELS[reason]}`,
      `Status: ${value}`,
    ].join('\n'),
    datetime: {
      timestamp,
      type: 'datetime',
    },
    byline: {
      text: creatorName,
    },
    sortTimestamp: toTimestampMillis(timestamp),
  }
}

const resolveNotificationCreators = async (
  notifications: OfficialVisitNotifications,
  manageUsersService: ManageUserService,
  user: HmppsUser,
): Promise<Array<{ notification: OfficialVisitNotifications[number]; creatorName: string }>> => {
  return Promise.all(
    notifications.map(async notification => {
      const createdBy = normalizeText(notification.createdBy)
      if (!createdBy) {
        return {
          notification,
          creatorName: DEFAULT_USER_LABEL,
        }
      }

      const createdUser = await manageUsersService.getUserByUsername(createdBy, user)
      return {
        notification,
        creatorName: withFallback(normalizeText(createdUser?.name), DEFAULT_USER_LABEL),
      }
    }),
  )
}

const buildHistoryTimeline = (
  historyEvents: AuditedEvent[],
  notificationsWithCreators: Array<{ notification: OfficialVisitNotifications[number]; creatorName: string }>,
): TimelineItem[] =>
  [...historyEvents.map(toTimelineItem), ...notificationsWithCreators.map(toNotificationTimelineItem)]
    .sort((a, b) => b.sortTimestamp - a.sortTimestamp)
    .map(({ sortTimestamp, ...timelineItem }) => timelineItem)

export default class OfficialVisitHistoryHandler implements PageHandler {
  public PAGE_NAME = Page.OFFICIAL_VISIT_HISTORY_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
    private readonly manageUsersService: ManageUserService,
  ) {}

  GET = async (
    req: Request<{
      ovId: string
    }>,
    res: Response,
  ) => {
    const { ovId } = req.params
    const { user } = res.locals

    const visitId = Number(ovId)
    if (!Number.isInteger(visitId) || visitId <= 0) {
      return res.status(400).render('pages/error', { message: 'Invalid official visit id' })
    }

    const [visit, historyEvents, notifications] = await Promise.all([
      this.officialVisitsService.getOfficialVisitById(visitId, user),
      this.officialVisitsService.getOfficialVisitAuditedEvents(visitId, user),
      this.officialVisitsService.getNotificationsByOfficialVisitId(visitId, user),
    ])

    const notificationsWithCreators = await resolveNotificationCreators(notifications, this.manageUsersService, user)

    const history = buildHistoryTimeline(historyEvents, notificationsWithCreators)

    this.telemetryService.trackEvent('OFFICIAL_VISIT_HISTORY_TIMELINE', user, {
      officialVisitId: visit.officialVisitId,
      prisonCode: visit.prisonCode,
      visitTypeCode: visit.visitTypeCode,
    })

    return res.render('pages/view/history', {
      prisoner: visit.prisonerVisited,
      history,
      backUrl: `/view/visit/${ovId}`,
    })
  }
}
