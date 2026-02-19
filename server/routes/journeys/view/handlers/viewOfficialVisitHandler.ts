import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'
import PersonalRelationshipsService from '../../../../services/personalRelationshipsService'
import ManageUserService from '../../../../services/manageUsersService'

export default class ViewOfficialVisitHandler implements PageHandler {
  public PAGE_NAME = Page.VIEW_OFFICIAL_VISIT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
    private readonly personalRelationshipsService: PersonalRelationshipsService,
    private readonly manageUsersService: ManageUserService,
  ) {}

  GET = async (req: Request, res: Response) => {
    const { ovId } = req.params
    const { user } = res.locals
    const b64BackTo = req.query.backTo as string

    const prisonCode = req.session.activeCaseLoadId
    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(ovId), user)

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

    const createdUser = await this.manageUsersService.getUserByUsername(visit.createdBy, user)
    const modifiedUser =
      visit.updatedBy === visit.createdBy || !visit.updatedBy
        ? createdUser
        : await this.manageUsersService.getUserByUsername(visit.updatedBy, user)

    const tryDecodeB64 = (b64: string) => {
      try {
        return b64 ? decodeURIComponent(atob(b64)) : null
      } catch {
        return null
      }
    }

    const updateVerb = req.flash('updateVerb')[0]
    return res.render('pages/view/visit', {
      visit: {
        ...visit,
        createdBy: createdUser.name,
        updatedBy: modifiedUser.name,
      },
      updateVerb,
      b64BackTo: b64BackTo || '',
      backUrl: tryDecodeB64(b64BackTo) || '/view/list',
      prisoner: {
        ...prisoner,
        restrictions: restrictions?.content || [],
        alertsCount: prisoner?.alerts?.filter(alert => alert.active)?.length ?? 0,
        restrictionsCount: restrictions?.content?.length ?? 0,
      },
    })
  }
}
