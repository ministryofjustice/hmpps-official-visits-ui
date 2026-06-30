import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import TelemetryService from '../../../../services/telemetryService'
import { AuditedEvent, OfficialVisitNotifications } from '../../../../@types/officialVisitsApi/types'
import { convertToTitleCase } from '../../../../utils/utils'

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

const FIELD_SEMANTICS: Record<string, ChangeSemantics> = {
  visitor_added: 'added',
  visitor_updated: 'updated',
  visitor_removed: 'removed',
}

type NotificationStatus =
  | 'PENDING'
  | 'SENT'
  | 'PERMANENT_FAILURE'
  | 'TEMPORARY_FAILURE'
  | 'TECHNICAL_FAILURE'
  | 'UNKNOWN'

const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: 'Email notification pending',
  SENT: 'Email notification sent',
  PERMANENT_FAILURE: 'Email notification permanently failed',
  TEMPORARY_FAILURE: 'Email notification temporarily failed',
  TECHNICAL_FAILURE: 'Email notification technical failure',
  UNKNOWN: 'Email notification status unknown',
}

const NOTIFICATION_STATUS_VALUES: Record<NotificationStatus, string> = {
  PENDING: 'Pending',
  SENT: 'Sent',
  PERMANENT_FAILURE: 'Permanent failure',
  TEMPORARY_FAILURE: 'Temporary failure',
  TECHNICAL_FAILURE: 'Technical failure',
  UNKNOWN: 'Unknown',
}

const isNotificationStatus = (value: string): value is NotificationStatus => value in NOTIFICATION_STATUS_LABELS

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

const resolveNotificationStatus = (status?: string | null): NotificationStatus => {
  const normalized = normalizeText(status)?.toUpperCase()
  return normalized && isNotificationStatus(normalized) ? normalized : 'UNKNOWN'
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

const toNotificationTimelineItem = (notification: OfficialVisitNotifications[number]): TimelineItemWithSort => {
  const status = resolveNotificationStatus(notification.emailStatus)
  const timestamp = getTimestamp(notification.statusUpdatedTime ?? notification.createdTime)
  const emailAddress = normalizeText(notification.emailAddress)
  const reason = withFallback(normalizeText(notification.reason), NOT_PROVIDED)

  return {
    label: {
      text: NOTIFICATION_STATUS_LABELS[status],
    },
    text: [
      `Email address: ${emailAddress ?? NOT_PROVIDED}`,
      `Reason: ${reason}`,
      `Status: ${NOTIFICATION_STATUS_VALUES[status]}`,
    ].join('\n'),
    datetime: {
      timestamp,
      type: 'datetime',
    },
    byline: {
      text: emailAddress ?? NOTIFICATION_STATUS_LABELS[status],
    },
    sortTimestamp: toTimestampMillis(timestamp),
  }
}

const buildHistoryTimeline = (
  historyEvents: AuditedEvent[],
  notifications: OfficialVisitNotifications,
): TimelineItem[] =>
  [...historyEvents.map(toTimelineItem), ...notifications.map(toNotificationTimelineItem)]
    .sort((a, b) => b.sortTimestamp - a.sortTimestamp)
    .map(({ sortTimestamp, ...timelineItem }) => timelineItem)

export default class OfficialVisitHistoryHandler implements PageHandler {
  public PAGE_NAME = Page.OFFICIAL_VISIT_HISTORY_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
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

    const history = buildHistoryTimeline(historyEvents, notifications)

    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_COMPLETING_VISIT', user, {
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
