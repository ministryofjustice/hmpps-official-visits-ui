import { Request, Response } from 'express'
import { PageHandler } from '../../../interfaces/pageHandler'
import { Page } from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { schema } from './viewOfficialVisitListSchema'

export default class ViewOfficialVisitListHandler implements PageHandler {
  public PAGE_NAME = Page.VIEW_OFFICIAL_VISIT_LIST_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  QUERY = schema

  GET = async (req: Request, res: Response) => {
    const prisonCode = req.session.activeCaseLoadId

    const filterParams: {
      page: number
      prisoner?: string
      startDate: string
      endDate: string
    } = {
      page: Number(req.body.page) || 1,
      ...(req.body.prisoner ? { prisoner: req.body.prisoner as string } : {}),
      startDate: (req.body.startDate as string) || new Date().toISOString().substring(0, 10),
      endDate:
        (req.body.endDate as string) || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    }

    const findByCriteria = {
      startDate: filterParams.startDate,
      endDate: filterParams.endDate,
      ...(filterParams.prisoner ? { prisonerNumbers: [filterParams.prisoner] } : {}),
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
    })

    res.redirect(`${req.originalUrl.split('?')[0]!}?${queryParams.toString()}`)
  }
}
