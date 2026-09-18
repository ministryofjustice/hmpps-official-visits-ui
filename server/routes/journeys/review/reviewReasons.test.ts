import { VisitForReview, VisitForReviewIssueType } from '../../../@types/officialVisitsApi/types'
import { isCancellable, reasonsFor } from './reviewReasons'

const review = (...issueTypes: VisitForReviewIssueType[]) =>
  ({
    visit: { officialVisitId: 1 },
    issues: issueTypes.map((issueType, index) => ({
      visitReviewDetailId: index,
      issueType,
      raisedTime: '2026-01-02T09:00:00',
    })),
  }) as VisitForReview

const allIssueTypes: VisitForReviewIssueType[] = [
  'PRISONER_RELEASED',
  'PRISONER_TRANSFERRED',
  'VISITOR_NOT_APPROVED',
  'VISITOR_NO_RELATIONSHIP',
  'VISITOR_NOT_OFFICIAL',
  'PRISONER_NEW_ALERT',
  'PRISONER_NEW_RESTRICTION',
]

describe('reasonsFor', () => {
  it('should give every issue type a label and a distinct tag colour', () => {
    const reasons = reasonsFor(review(...allIssueTypes))

    expect(reasons.map(reason => reason.text)).toEqual([
      'Prisoner released',
      'Prisoner transferred',
      'Contact not approved',
      'Unauthorised visitor',
      'Social visitor',
      'New alert',
      'New restriction',
    ])
    expect(new Set(reasons.map(reason => reason.classes)).size).toBe(allIssueTypes.length)
  })

  it('should de-duplicate and order tags however the API returns them', () => {
    const reasons = reasonsFor(review('VISITOR_NOT_OFFICIAL', 'PRISONER_RELEASED', 'PRISONER_RELEASED'))

    expect(reasons.map(reason => reason.text)).toEqual(['Prisoner released', 'Social visitor'])
  })

  it('should return no reasons for a visit with no issues', () => {
    expect(reasonsFor(review())).toEqual([])
    expect(reasonsFor({ visit: { officialVisitId: 1 } } as VisitForReview)).toEqual([])
  })
})

describe('isCancellable', () => {
  it('should be cancellable only when the prisoner has left the prison', () => {
    expect(isCancellable(review('PRISONER_RELEASED'))).toBe(true)
    expect(isCancellable(review('PRISONER_TRANSFERRED'))).toBe(true)
    expect(isCancellable(review('VISITOR_NOT_APPROVED', 'PRISONER_RELEASED'))).toBe(true)

    expect(isCancellable(review('VISITOR_NOT_APPROVED'))).toBe(false)
    expect(isCancellable(review('VISITOR_NO_RELATIONSHIP'))).toBe(false)
    expect(isCancellable(review('VISITOR_NOT_OFFICIAL'))).toBe(false)
    expect(isCancellable(review('PRISONER_NEW_ALERT'))).toBe(false)
    expect(isCancellable(review('PRISONER_NEW_RESTRICTION'))).toBe(false)
    expect(isCancellable(review())).toBe(false)
  })
})
