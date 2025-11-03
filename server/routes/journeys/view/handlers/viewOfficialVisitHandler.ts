import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'

export default class ViewOfficialVisitHandler implements PageHandler {
  public PAGE_NAME = Page.VIEW_OFFICIAL_VISIT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
  ) {}

  GET = async (req: Request, res: Response) => {
    const { officialVisitId } = req.params
    const { user } = res.locals

    const visit = await this.officialVisitsService.getOfficialVisitById(+officialVisitId, user)

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

    return res.render('pages/view/visit', { visit })
  }
}
