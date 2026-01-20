import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'
import PersonalRelationshipsService from '../../../../services/personalRelationshipsService'

export default class ViewOfficialVisitHandler implements PageHandler {
  public PAGE_NAME = Page.VIEW_OFFICIAL_VISIT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
    private readonly personalRelationshipsService: PersonalRelationshipsService,
  ) {}

  GET = async (req: Request, res: Response) => {
    const { officialVisitId } = req.params
    const { user } = res.locals

    const prisonCode = req.session.activeCaseLoadId
    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(officialVisitId), user)

    const [restrictions, prisoner] = await Promise.all([
      this.personalRelationshipsService.getPrisonerRestrictions(
        visit.prisonerVisited.prisonerNumber,
        0,
        10,
        user,
        true,
        false,
      ),
      this.prisonerService.getPrisonerByPrisonerNumber(visit.prisonerVisited.prisonerNumber, user),
    ])

    return res.render('pages/view/visit', {
      visit,
      prisoner: {
        ...prisoner,
        restrictions: restrictions?.content || [],
        alertsCount: prisoner?.alerts?.filter(alert => alert.active)?.length ?? 0,
        restrictionsCount: restrictions?.content?.length ?? 0,
      },
    })
  }
}
