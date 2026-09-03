import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import TelemetryService from '../../../../services/telemetryService'
import { VisitForReview } from '../../../../@types/officialVisitsApi/types'
import { isCancellable, reasonsFor, ReviewReason } from '../reviewReasons'
import { encodeBackTo } from '../../../../utils/backTo'

const PAGE_SIZE = 10

export type ReviewRow = {
  officialVisitId: number
  prisonerNumber: string
  prisonerName: string
  visitDate: string
  startTime: string
  endTime: string
  reasons: ReviewReason[]
  cancellable: boolean
}

export default class VisitsNeedReviewHandler implements PageHandler {
  public PAGE_NAME = Page.VISITS_NEED_REVIEW_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const prisonCode = res.locals.user.activeCaseLoadId

    const parsedPage = Number(req.query.page)
    const requestedPage = parsedPage && parsedPage > 0 ? parsedPage : 1

    const reviews = await this.officialVisitsService.getVisitsForReview(prisonCode, user)
    const allRows = sortBySoonestFirst(toRows(reviews))

    const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE))
    const page = Math.min(requestedPage, totalPages)
    const rows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_VISITS_NEED_REVIEW_PAGE', user, {
      totalVisits: allRows.length,
    })

    return res.render('pages/review/visitsNeedReview', {
      backUrl: '/',
      rows,
      backTo: encodeBackTo(req.originalUrl),
      returnTo: req.originalUrl,
      pagination: {
        page,
        size: PAGE_SIZE,
        totalElements: allRows.length,
        totalPages,
        // simplePagination substitutes the URL-encoded placeholder, not a literal {page}
        hrefTemplate: '?page=%7Bpage%7D',
      },
    })
  }
}

const toRows = (reviews: VisitForReview[]): ReviewRow[] =>
  reviews.map(review => {
    const prisoner = review.visit.prisonerVisited
    const lastName = prisoner?.lastName ?? ''
    const firstName = prisoner?.firstName ?? ''

    return {
      officialVisitId: review.visit.officialVisitId,
      prisonerNumber: prisoner?.prisonerNumber ?? '',
      prisonerName: [lastName, firstName].filter(Boolean).join(', '),
      visitDate: review.visit.visitDate,
      startTime: review.visit.startTime,
      endTime: review.visit.endTime,
      reasons: reasonsFor(review),
      cancellable: isCancellable(review),
    }
  })

/**
 * Soonest visit first, so the most urgent review is at the top.
 *
 * Applied here rather than relying on the API's sort parameter because paging is done in this
 * layer — the whole list has to be in a known order before it is sliced into pages.
 */
const sortBySoonestFirst = (rows: ReviewRow[]): ReviewRow[] =>
  [...rows].sort((a, b) => `${a.visitDate}${a.startTime}`.localeCompare(`${b.visitDate}${b.startTime}`))
