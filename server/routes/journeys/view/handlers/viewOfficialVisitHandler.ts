import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'
import PersonalRelationshipsService from '../../../../services/personalRelationshipsService'
import ManageUserService from '../../../../services/manageUsersService'
import TelemetryService from '../../../../services/telemetryService'
import { RestrictionSummary } from '../../../../@types/officialVisitsApi/types'
import { prisonAllowsSocialVisitors, socialVisitorsPageEnabled } from '../../../../utils/utils'

export default class ViewOfficialVisitHandler implements PageHandler {
  public PAGE_NAME = Page.VIEW_OFFICIAL_VISIT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
    private readonly personalRelationshipsService: PersonalRelationshipsService,
    private readonly manageUsersService: ManageUserService,
    private readonly telemetryService: TelemetryService,
  ) {}

  GET = async (req: Request, res: Response) => {
    const { ovId } = req.params
    const { user } = res.locals
    const b64BackTo = req.query.backTo as string

    const prisonCode = req.session.activeCaseLoadId
    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(ovId), user)

    const [restrictions, prisoner, contacts] = await Promise.all([
      this.personalRelationshipsService.getPrisonerRestrictions(
        visit.prisonerVisited.prisonerNumber,
        0,
        10,
        user,
        true,
        false,
      ),
      this.prisonerService.getPrisonerByPrisonerNumber(visit.prisonerVisited.prisonerNumber, user),
      this.officialVisitsService.getAllContacts(visit.prisonerVisited.prisonerNumber, user),
    ])

    let hasIssueVisitors = false
    const enrichedVisitors = (visit.officialVisitors || []).map(visitor => {
      const contact = contacts?.find(
        c => c.contactId === visitor.contactId && c.relationshipToPrisonerCode === visitor.relationshipCode,
      )

      if (
        !contact ||
        !contact?.isApprovedVisitor ||
        (!prisonAllowsSocialVisitors(req) && visitor.relationshipTypeCode === 'SOCIAL')
      ) {
        hasIssueVisitors = true
      }
      return {
        ...visitor,
        restrictionSummary: contact?.restrictionSummary || { active: [] as RestrictionSummary[] },
      }
    })

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

    if (hasIssueVisitors && !req.query.continue) {
      return res.render('pages/view/interrupt', {
        visitId: visit.officialVisitId,
        b64BackTo,
        backUrl: tryDecodeB64(b64BackTo) || '/view/list',
        prisoner: {
          ...prisoner,
          restrictions: restrictions?.content || [],
          alertsCount: prisoner?.alerts?.filter(alert => alert.active)?.length ?? 0,
          restrictionsCount: restrictions?.content?.length ?? 0,
        },
      })
    }

    const updateVerb = req.flash('updateVerb')[0]
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW', user, {
      officialVisitId: ovId,
      prisonCode,
    })
    return res.render('pages/view/visit', {
      visit: {
        ...visit,
        officialVisitors: enrichedVisitors,
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
