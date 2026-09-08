import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import TelemetryService from '../../../../services/telemetryService'

const PAGE_SIZE = 10

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
      reviews: content,
      backTo: encodeURIComponent(btoa(req.originalUrl)),
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
