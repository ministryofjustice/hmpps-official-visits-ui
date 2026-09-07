import { VisitForReview, VisitForReviewIssueType } from '../../../@types/officialVisitsApi/types'

export type ReviewReason = {
  text: string
  classes: string
}

const REVIEW_REASONS: Record<VisitForReviewIssueType, ReviewReason> = {
  PRISONER_RELEASED: { text: 'Prisoner released', classes: 'govuk-tag--red' },
  PRISONER_TRANSFERRED: { text: 'Prisoner transferred', classes: 'govuk-tag--orange' },
  VISITOR_NOT_APPROVED: { text: 'Contact not approved', classes: 'govuk-tag--grey' },
  VISITOR_NO_RELATIONSHIP: { text: 'Unauthorised visitor', classes: 'govuk-tag--blue' },
  VISITOR_NOT_OFFICIAL: { text: 'Social visitor', classes: 'govuk-tag--green' },
  PRISONER_NEW_ALERT: { text: 'New alert', classes: 'govuk-tag--yellow' },
  PRISONER_NEW_RESTRICTION: { text: 'New restriction', classes: 'govuk-tag--pink' },
}

const CANCELLABLE_ISSUE_TYPES: VisitForReviewIssueType[] = ['PRISONER_RELEASED', 'PRISONER_TRANSFERRED']

export const reasonsFor = ({ issues }: VisitForReview): ReviewReason[] => {
  const issueTypes = new Set(issues?.map(issue => issue.issueType))
  return Object.entries(REVIEW_REASONS)
    .filter(([issueType]) => issueTypes.has(issueType as VisitForReviewIssueType))
    .map(([, reason]) => reason)
}

export const isCancellable = ({ issues }: VisitForReview): boolean =>
  !!issues?.some(issue => CANCELLABLE_ISSUE_TYPES.includes(issue.issueType))
