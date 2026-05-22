import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService, {
  SentEmailSearchCriteria,
  SentEmailSearchResults,
} from '../../../../services/officialVisitsService'
import { formatDate } from '../../../../utils/utils'
import { schema, SchemaType } from './sentEmailsHandlerSchema'

const PAGE_SIZE = 10

const EMPTY_RESULTS: SentEmailSearchResults = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: PAGE_SIZE,
  first: true,
  last: true,
}

const formatInputDate = (date?: Date) => (date ? formatDate(date, 'dd/MM/yyyy') : undefined)

const buildHrefTemplate = (fromDate?: string, toDate?: string) => {
  const queryParts = [
    ...(fromDate ? [`fromDate=${encodeURIComponent(fromDate)}`] : []),
    ...(toDate ? [`toDate=${encodeURIComponent(toDate)}`] : []),
    'page=%7Bpage%7D',
  ]

  return `?${queryParts.join('&')}`
}

export default class SentEmailsHandler implements PageHandler {
  public PAGE_NAME = Page.VIEW_SENT_EMAILS_PAGE

  public QUERY = schema

  public BODY = this.QUERY

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  GET = async (req: Request, res: Response) => {
    const prisonName = res.locals.user.activeCaseLoad?.description || 'this prison'

    const search = req.body as SchemaType
    const page = Number(req.query.page) || 1
    const formResponses = (res.locals['formResponses'] ?? {}) as { fromDate?: string; toDate?: string }

    const fromDateValue = formResponses.fromDate || formatInputDate(search.fromDate)
    const toDateValue = formResponses.toDate || formatInputDate(search.toDate)

    const results: SentEmailSearchResults = res.locals.validationErrors
      ? EMPTY_RESULTS
      : await this.officialVisitsService.getSentEmails(
          {
            page,
            size: PAGE_SIZE,
            fromDate: search.fromDate,
            toDate: search.toDate,
          } as SentEmailSearchCriteria,
          res.locals.user,
        )

    return res.render('pages/view/sentEmails', {
      pageTitle: `Official visit emails sent from ${prisonName}`,
      fromDateValue,
      prisonName,
      toDateValue,
      results,
      pagination:
        results.totalElements > 0
          ? {
              ...results,
              page: results.number + 1,
              hrefTemplate: buildHrefTemplate(fromDateValue, toDateValue),
            }
          : undefined,
    })
  }

  POST = async (req: Request, res: Response) => {
    const search = req.body as SchemaType
    const queryParams = new URLSearchParams({
      ...(search.fromDate ? { fromDate: formatDate(search.fromDate, 'dd/MM/yyyy') } : {}),
      ...(search.toDate ? { toDate: formatDate(search.toDate, 'dd/MM/yyyy') } : {}),
      page: '1',
    })

    return res.redirect(`${req.originalUrl.split('?')[0]!}?${queryParams.toString()}`)
  }
}
