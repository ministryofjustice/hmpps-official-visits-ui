import HmppsAuditClient, { AuditEvent } from '../data/hmppsAuditClient'

export enum Page {
  EXAMPLE_PAGE = 'EXAMPLE_PAGE',
  VIEW_OFFICIAL_VISIT_PAGE = 'VIEW_OFFICIAL_VISIT_PAGE',
  VIEW_OFFICIAL_VISIT_LIST_PAGE = 'VIEW_OFFICIAL_VISIT_LIST_PAGE',
  PRISONER_SEARCH_PAGE = 'PRISONER_SEARCH_PAGE',
  PRISONER_SEARCH_RESULTS_PAGE = 'PRISONER_SEARCH_RESULTS_PAGE',
  PRISONER_NOT_LISTED_PAGE = 'PRISONER_NOT_LISTED_PAGE',
  CHOOSE_TIME_SLOT_PAGE = 'CHOOSE_TIME_SLOT_PAGE',
  CHECK_YOUR_ANSWERS_PAGE = 'CHECK_YOUR_ANSWERS_PAGE',
  CONFIRM_VISIT_PAGE = 'CONFIRM_VISIT_PAGE',
  CHECK_CANCEL_PAGE = 'CHECK_CANCEL_PAGE',
  CONFIRM_CANCEL_VISIT_PAGE = 'CONFIRM_CANCEL_VISIT_PAGE',
}

export interface PageViewEventDetails {
  who: string
  subjectId?: string
  subjectType?: string
  correlationId?: string
  details?: object
}

export default class AuditService {
  constructor(private readonly hmppsAuditClient: HmppsAuditClient) {}

  async logAuditEvent(event: AuditEvent) {
    await this.hmppsAuditClient.sendMessage(event)
  }

  async logPageView(page: Page, eventDetails: PageViewEventDetails) {
    const event: AuditEvent = {
      ...eventDetails,
      what: `PAGE_VIEW_${page}`,
    }
    await this.hmppsAuditClient.sendMessage(event)
  }
}
