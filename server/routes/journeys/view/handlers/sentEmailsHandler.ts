import { Request, Response } from 'express'
import { subDays } from 'date-fns'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { formatDate } from '../../../../utils/utils'
import { schema, SchemaType } from './sentEmailsHandlerSchema'
import { NotificationSearchRequest, PagedModelSentNotification } from '../../../../@types/officialVisitsApi/types'

const PAGE_SIZE = 10

const EMPTY_RESULTS: PagedModelSentNotification = {
  content: [],
  page: {
    number: 0,
    size: 0,
    totalElements: 0,
    totalPages: 0,
  },
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
    const prisonCode = res.locals.user.activeCaseLoadId

    const search = req.body as SchemaType
    const pageQuery = req.query.page ? req.query.page : req.query.page
    const parsedPage = Number(pageQuery)
    const page = parsedPage && parsedPage > 0 ? parsedPage : 1

    const formResponses = (res.locals['formResponses'] ?? {}) as { fromDate?: string; toDate?: string }

    const fromDate = search.fromDate || subDays(new Date(), 7)
    const fromDateValue = formResponses.fromDate || formatInputDate(fromDate)
    const toDate = search.toDate || new Date()
    const toDateValue = formResponses.toDate || formatInputDate(toDate)

    const request: NotificationSearchRequest = {}
    if (fromDate) {
      const formattedFromDate = formatDate(fromDate, 'yyyy-MM-dd')
      if (formattedFromDate) request.fromDate = formattedFromDate
    }
    if (toDate) {
      const formattedToDate = formatDate(toDate || new Date(), 'yyyy-MM-dd')
      if (formattedToDate) request.toDate = formattedToDate
    }

    const results: PagedModelSentNotification = res.locals.validationErrors
      ? EMPTY_RESULTS
      : await (this.officialVisitsService.getSentNotifications(
          prisonCode,
          request,
          page,
          PAGE_SIZE,
          res.locals.user,
        ) as Promise<PagedModelSentNotification>)

    return res.render('pages/view/sentEmails', {
      pageTitle: `Official visit emails sent from ${prisonName}`,
      backUrl: `/`,
      fromDateValue,
      prisonName,
      toDateValue,
      results,
      pagination:
        results.page.totalElements > 0
          ? {
              ...results.page,
              page: results.page.number + 1,
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
