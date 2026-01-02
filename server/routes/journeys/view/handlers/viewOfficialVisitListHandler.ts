import { Request, Response } from 'express'
import { PageHandler } from '../../../interfaces/pageHandler'
import { Page } from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { ReferenceDataItem, VisitStatusType, VisitType } from '../../../../@types/officialVisitsApi/types'
import { schema } from './viewOfficialVisitListSchema'

export default class ViewOfficialVisitListHandler implements PageHandler {
  public PAGE_NAME = Page.VIEW_OFFICIAL_VISIT_LIST_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  QUERY = schema

  GET = async (req: Request, res: Response) => {
    const statusOpts = await this.officialVisitsService.getReferenceData(res, 'VIS_STATUS')
    const typeOpts = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE')

    const prisonCode = req.session.activeCaseLoadId

    // Get all available locations
    const slots = await this.officialVisitsService.getAvailableSlots(
      res,
      prisonCode,
      new Date().toISOString().substring(0, 10),
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().substring(0, 10),
    )

    // Find unique locations
    const locations = slots.reduce(
      (acc, slot) => {
        if (!acc.find(o => o.code === slot.dpsLocationId)) {
          acc.push({ code: slot.dpsLocationId, text: slot.locationDescription })
        }
        return acc
      },
      [] as { code: string; text: string }[],
    )

    const filterParams: {
      page: number
      status?: VisitStatusType
      type?: VisitType
      queryPrisonerNumber?: string
      startDate: string
      endDate: string
      location?: string
    } = {
      page: Number(req.body.page) || 1,
      // RefDataItems could be validated in the schema like dates are, but both schema and handler need this array and it feels unecessary to duplicate calls
      // Could we store and reuse this list somewhere?
      ...validateRefDataItem<VisitStatusType>('status', req.body.status as string, statusOpts),
      ...validateRefDataItem<VisitType>('type', req.body.type as string, typeOpts),
      ...validateRefDataItem('location', req.body.location as string, locations),
      ...(req.body.queryPrisonerNumber ? { queryPrisonerNumber: req.body.queryPrisonerNumber as string } : {}),
      startDate:
        (req.body.startDate as string) ||
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      endDate:
        (req.body.endDate as string) || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    }

    const findByCriteria = {
      startDate: filterParams.startDate,
      endDate: filterParams.endDate,
      ...(filterParams.status ? { visitStatuses: [filterParams.status] } : {}),
      ...(filterParams.type ? { visitTypes: [filterParams.type] } : {}),
      ...(filterParams.queryPrisonerNumber ? { prisonerNumbers: [filterParams.queryPrisonerNumber] } : {}),
      ...(filterParams.location ? { locationIds: [filterParams.location] } : {}),
    }

    const visits = res.locals['validationErrors']
      ? { content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 0 } }
      : await this.officialVisitsService.getVisits(res, prisonCode, findByCriteria, filterParams.page - 1, 10)

    const queryParams = new URLSearchParams({ ...filterParams, page: '{page}' })

    return res.render('pages/view/visitList', {
      visits: visits.content,
      pagination: {
        ...visits.page,
        page: visits.page.number + 1,
        hrefTemplate: `${req.originalUrl.split('?')[0]!}?${queryParams.toString()}`,
      },
      statuses: statusOpts.map(o => ({ value: o.code, text: o.description })),
      types: typeOpts.map(o => ({ value: o.code, text: o.description })),
      filter: filterParams,
      locations: locations.map(o => ({ value: o.code, text: o.text })),
    })
  }

  POST = async (req: Request, res: Response) => {
    const convertDate = (date: string) =>
      date
        .split('/')
        .reverse()
        .map(o => o.padStart(2, '0'))
        .join('-')

    const queryParams = new URLSearchParams({
      ...(req.body.queryPrisonerNumber ? { queryPrisonerNumber: req.body.queryPrisonerNumber } : {}),
      ...(req.body.status ? { status: req.body.status } : {}),
      ...(req.body.type ? { type: req.body.type } : {}),
      ...(req.body.startDate ? { startDate: convertDate(req.body.startDate) } : {}),
      ...(req.body.endDate ? { endDate: convertDate(req.body.endDate) } : {}),
      ...(req.body.location ? { location: req.body.location } : {}),
      page: '1',
    })

    res.redirect(`${req.originalUrl.split('?')[0]!}?${queryParams.toString()}`)
  }
}

function validateRefDataItem<T>(key: string, code: string, items: ReferenceDataItem[]) {
  const item = items.find(o => o.code === code)?.code as T
  return item ? { [key]: item } : {}
}
