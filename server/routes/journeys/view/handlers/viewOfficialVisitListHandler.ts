import { Request, Response } from 'express'
import { PageHandler } from '../../../interfaces/pageHandler'
import { Page } from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { schema } from './viewOfficialVisitListSchema'
import { ReferenceDataItem, VisitStatusType, VisitType } from '../../../../@types/officialVisitsApi/types'

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
      prisoner?: string
      startDate: string
      endDate: string
      status?: VisitStatusType[]
      type?: VisitType[]
      location?: string[]
    } = {
      page: Number(req.body.page) || 1,
      ...(req.body.prisoner ? { prisoner: req.body.prisoner as string } : {}),
      startDate: (req.body.startDate as string) || new Date().toISOString().substring(0, 10),
      endDate:
        (req.body.endDate as string) || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      ...validateRefDataItems<VisitStatusType>('status', req.body.status as string, statusOpts),
      ...validateRefDataItems<VisitType>('type', req.body.type as string, typeOpts),
      ...validateRefDataItems('location', req.body.location as string, locations),
    }

    const findByCriteria = {
      startDate: filterParams.startDate,
      endDate: filterParams.endDate,
      ...(filterParams.prisoner ? { prisonerNumbers: [filterParams.prisoner] } : {}),
      ...(filterParams.status ? { visitStatuses: filterParams.status } : {}),
      ...(filterParams.type ? { visitTypes: filterParams.type } : {}),
      ...(filterParams.location ? { locationIds: filterParams.location } : {}),
    }

    const visits = res.locals['validationErrors']
      ? { content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 0 } }
      : await this.officialVisitsService.getVisits(
          prisonCode,
          findByCriteria,
          filterParams.page - 1,
          10,
          res.locals.user,
        )

    const queryParams = new URLSearchParams({ ...filterParams, page: '{page}' })

    return res.render('pages/view/visitList', {
      visits: visits.content,
      backUrl: `/`,
      pagination: {
        ...visits.page,
        page: visits.page.number + 1,
        hrefTemplate: `${req.originalUrl.split('?')[0]!}?${queryParams.toString()}`,
      },
      filter: filterParams,
      statuses: statusOpts.map(o => ({ value: o.code, text: o.description })),
      types: typeOpts.map(o => ({ value: o.code, text: o.description })),
      locations: locations.map(o => ({ value: o.code, text: o.text })),
      showFilter: filterParams.location?.length || filterParams.type?.length || filterParams.status?.length,
      clearLink: new URLSearchParams({
        page: '1',
        startDate: filterParams.startDate,
        endDate: filterParams.endDate,
        ...(filterParams.prisoner ? { prisoner: filterParams.prisoner } : {}),
      }).toString(),
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
      ...(req.body.prisoner ? { prisoner: req.body.prisoner } : {}),
      ...(req.body.startDate ? { startDate: convertDate(req.body.startDate) } : {}),
      ...(req.body.endDate ? { endDate: convertDate(req.body.endDate) } : {}),
      page: '1',
      ...(req.body.status ? { status: req.body.status } : {}),
      ...(req.body.type ? { type: req.body.type } : {}),
      ...(req.body.location ? { location: req.body.location } : {}),
    })

    res.redirect(`${req.originalUrl.split('?')[0]!}?${queryParams.toString()}`)
  }
}

function validateRefDataItems<T>(key: string, code: string, items: ReferenceDataItem[]) {
  const codes = code?.split(',') || []
  const found = codes.map(c => items.find(o => o.code === c)?.code as T).filter(o => o)
  return found.length ? { [key]: found } : {}
}
