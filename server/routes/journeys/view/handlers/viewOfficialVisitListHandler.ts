import { Request, Response } from 'express'
import { PageHandler } from '../../../interfaces/pageHandler'
import { Page } from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'
import { ReferenceDataItem, VisitStatusType, VisitType } from '../../../../@types/officialVisitsApi/types'
import { schema } from './viewOfficialVisitListSchema'

export default class ViewOfficialVisitListHandler implements PageHandler {
  public PAGE_NAME = Page.VIEW_OFFICIAL_VISIT_LIST_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
  ) {}

  QUERY = schema

  GET = async (req: Request, res: Response) => {
    const statusOpts = await this.officialVisitsService.getReferenceData(res, 'VIS_STATUS')
    const typeOpts = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE')

    const filterParams: {
      page: number
      status?: VisitStatusType
      type?: VisitType
      queryPrisonerNumber?: string
      startDate: string
      endDate: string
    } = {
      page: Number(req.query.page) || 1,
      ...validateRefDataItem<VisitStatusType>('status', req.query.status as string, statusOpts),
      ...validateRefDataItem<VisitType>('type', req.query.type as string, typeOpts),
      ...(req.query.queryPrisonerNumber
        ? { queryPrisonerNumber: (req.query.queryPrisonerNumber as string) || undefined }
        : {}),
      startDate:
        (req.query.startDate as string) ||
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      endDate:
        (req.query.endDate as string) || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    }

    // TODO: Implement a get official vists for the prison, between two dates or on this date
    const prisonCode = req.session.activeCaseLoadId

    const findByCriteria = {
      startDate: filterParams.startDate,
      endDate: filterParams.endDate,
      ...(filterParams.status ? { visitStatuses: [filterParams.status] } : {}),
      ...(filterParams.type ? { visitTypes: [filterParams.type] } : {}),
      ...(filterParams.queryPrisonerNumber ? { prisonerNumbers: [filterParams.queryPrisonerNumber] } : {}),
    }

    const visits = res.locals['validationErrors']
      ? { content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 0 } }
      : await this.officialVisitsService.getVisits(res, prisonCode, findByCriteria, filterParams.page, 10)

    // TODO: Get the prisoner number from the visit & enrich info
    /*
    import { parse, parseISO } from 'date-fns'

    const { prisonerNumber, prisonCode } = visit

    const [prisoner, prison] = await Promise.all([
      this.prisonerService.getPrisonerByPrisonerNumber(prisonerNumber, user),
      this.prisonService.getPrisonByCode(prisonCode, user),
    ])

    const date = parseISO(visit.visitDate)
    const time = parse(visit.startTime, 'HH:mm', new Date(0))

    // TODO: Is amendable if the visit start time is not in the past
    const isAmendable = this.officialVisitsService.visitIsAmendable(date, time, booking.statusCode)

    // Pass these through to the view
      prisoner,
      visit,
      isAmendable,
      isCancelled: visit.statusCode === 'CANCELLED',
     */

    const queryParams = new URLSearchParams({ ...filterParams, page: '{page}' })

    return res.render('pages/view/visitList', {
      visits: visits.content,
      pagination: {
        ...visits.page,
        hrefTemplate: `${req.originalUrl.split('?')[0]!}?${queryParams.toString()}`,
      },
      statuses: statusOpts.map(o => ({ value: o.code, text: o.description })),
      types: typeOpts.map(o => ({ value: o.code, text: o.description })),
      filter: filterParams,
    })
  }

  POST = async (req: Request, res: Response) => {
    const convertDate = (date: string) => date.split('/').reverse().join('-')

    const queryParams = new URLSearchParams({
      ...(req.body.queryPrisonerNumber ? { queryPrisonerNumber: req.body.queryPrisonerNumber } : {}),
      ...(req.body.status ? { status: req.body.status } : {}),
      ...(req.body.type ? { type: req.body.type } : {}),
      ...(req.body.startDate ? { startDate: convertDate(req.body.startDate) } : {}),
      ...(req.body.endDate ? { endDate: convertDate(req.body.endDate) } : {}),
      page: '1',
    })

    res.redirect(`${req.originalUrl.split('?')[0]!}?${queryParams.toString()}`)
  }
}

function validateRefDataItem<T>(key: string, code: string, items: ReferenceDataItem[]) {
  const item = items.find(o => o.code === code)?.code as T
  return item ? { [key]: item } : {}
}
