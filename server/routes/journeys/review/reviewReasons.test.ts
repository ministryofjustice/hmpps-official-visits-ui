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

describe('reasonsFor', () => {
  it.each<[VisitForReviewIssueType, string]>([
    ['PRISONER_RELEASED', 'Prisoner released'],
    ['PRISONER_TRANSFERRED', 'Prisoner transferred'],
    ['VISITOR_NOT_APPROVED', 'Contact not approved'],
    ['VISITOR_NO_RELATIONSHIP', 'Unauthorised visitor'],
    ['VISITOR_NOT_OFFICIAL', 'Social visitor'],
    ['PRISONER_NEW_ALERT', 'New alert'],
    ['PRISONER_NEW_RESTRICTION', 'New restriction'],
  ])('should label %s as "%s"', (issueType, text) => {
    expect(reasonsFor(review(issueType))).toEqual([{ text, classes: expect.stringContaining('govuk-tag--') }])
  })

  it('should give each issue type a distinct tag colour', () => {
    const allIssueTypes: VisitForReviewIssueType[] = [
      'PRISONER_RELEASED',
      'PRISONER_TRANSFERRED',
      'VISITOR_NOT_APPROVED',
      'VISITOR_NO_RELATIONSHIP',
      'VISITOR_NOT_OFFICIAL',
      'PRISONER_NEW_ALERT',
      'PRISONER_NEW_RESTRICTION',
    ]

    const classes = reasonsFor(review(...allIssueTypes)).map(reason => reason.classes)

    expect(new Set(classes).size).toBe(allIssueTypes.length)
  })

  it('should show one tag per issue type when a visit repeats the same issue', () => {
    expect(reasonsFor(review('PRISONER_RELEASED', 'PRISONER_RELEASED'))).toEqual([
      { text: 'Prisoner released', classes: expect.any(String) },
    ])
  })

  it('should order tags consistently regardless of the order the API returns issues', () => {
    const ordered = reasonsFor(review('PRISONER_RELEASED', 'VISITOR_NOT_OFFICIAL'))
    const reversed = reasonsFor(review('VISITOR_NOT_OFFICIAL', 'PRISONER_RELEASED'))

    expect(reversed).toEqual(ordered)
    expect(ordered.map(reason => reason.text)).toEqual(['Prisoner released', 'Social visitor'])
  })

  it('should return no reasons for a visit with no issues', () => {
    expect(reasonsFor(review())).toEqual([])
    expect(reasonsFor({ visit: { officialVisitId: 1 } } as VisitForReview)).toEqual([])
  })
})

describe('isCancellable', () => {
  it.each<[VisitForReviewIssueType, boolean]>([
    ['PRISONER_RELEASED', true],
    ['PRISONER_TRANSFERRED', true],
    ['VISITOR_NOT_APPROVED', false],
    ['VISITOR_NO_RELATIONSHIP', false],
    ['VISITOR_NOT_OFFICIAL', false],
    ['PRISONER_NEW_ALERT', false],
    ['PRISONER_NEW_RESTRICTION', false],
  ])('should return %s -> %s', (issueType, expected) => {
    expect(isCancellable(review(issueType))).toBe(expected)
  })

  it('should be cancellable when any one issue qualifies', () => {
    expect(isCancellable(review('VISITOR_NOT_APPROVED', 'PRISONER_RELEASED'))).toBe(true)
  })

  it('should not be cancellable with no issues', () => {
    expect(isCancellable(review())).toBe(false)
    expect(isCancellable({ visit: { officialVisitId: 1 } } as VisitForReview)).toBe(false)
  })
})
