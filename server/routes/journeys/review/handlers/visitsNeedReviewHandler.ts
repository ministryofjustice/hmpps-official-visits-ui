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
    const prisonCode = user.activeCaseLoadId

    const parsedPage = Number(req.query.page)
    const page = parsedPage && parsedPage > 0 ? parsedPage : 1

    const { content = [], page: pageMetadata } = await this.officialVisitsService.getVisitsForReview(
      prisonCode,
      page - 1,
      PAGE_SIZE,
      user,
    )

    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_VISITS_NEED_REVIEW_PAGE', user, {
      totalVisits: pageMetadata?.totalElements ?? 0,
    })

    return res.render('pages/review/visitsNeedReview', {
      backUrl: '/',
      rows: toRows(content),
      backTo: encodeBackTo(req.originalUrl),
      returnTo: req.originalUrl,
      pagination: {
        page,
        size: PAGE_SIZE,
        totalElements: pageMetadata?.totalElements ?? 0,
        totalPages: pageMetadata?.totalPages ?? 0,
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
