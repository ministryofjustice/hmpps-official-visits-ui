import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import PrisonerService from '../../../../../services/prisonerService'
import PersonalRelationshipsService from '../../../../../services/personalRelationshipsService'
import ManageUserService from '../../../../../services/manageUsersService'

export default class AmendVisitLandingHandler implements PageHandler {
  public PAGE_NAME = Page.AMEND_LANDING_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
    private readonly personalRelationshipsService: PersonalRelationshipsService,
    private readonly manageUsersService: ManageUserService,
  ) {}

  GET = async (req: Request, res: Response) => {
    const { ovId } = req.params
    const { user } = res.locals
    const b64BackTo = req.session.journey.amendVisit?.backTo || (req.query.backTo as string)

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

    // Save to journey data
    req.session.journey.officialVisit = {
      dpsLocationId: visit.dpsLocationId,
      endTime: visit.endTime,
      locationDescription: visit.locationDescription,
      officialVisitId: visit.officialVisitId,
      prisoner: {
        ...visit.prisonerVisited,
        prisonName: prisoner.prisonName,
        restrictions: restrictions?.content || [],
        alertsCount: prisoner?.alerts?.filter(alert => alert.active)?.length ?? 0,
        restrictionsCount: restrictions?.content?.length ?? 0,
      },
      prisonCode: visit.prisonCode,
      prisonerNotes: visit.prisonerNotes,
      selectedTimeSlot: {
        dpsLocationId: visit.dpsLocationId,
        endTime: visit.endTime,
        startTime: visit.startTime,
        visitSlotId: visit.visitSlotId,
        locationDescription: visit.locationDescription,
      },
      staffNotes: visit.staffNotes,
      visitDate: visit.visitDate,
      visitStatusCode: visit.visitStatus,
      visitType: visit.visitTypeCode,
    }

    req.session.journey.amendVisit = {
      backTo: b64BackTo,
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
      journeyId: req.params.journeyId,
      backUrl: `/view/visit/${visit.officialVisitId}?backTo=${b64BackTo}`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }
}
