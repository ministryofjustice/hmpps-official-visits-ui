import { Request, Response } from 'express'
import { isFuture } from 'date-fns'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'
import PersonalRelationshipsService from '../../../../services/personalRelationshipsService'
import ManageUserService from '../../../../services/manageUsersService'
import TelemetryService from '../../../../services/telemetryService'
import { OfficialVisit, RestrictionSummary } from '../../../../@types/officialVisitsApi/types'
import { prisonAllowsSocialVisitors } from '../../../../utils/utils'
import config from '../../../../config'
import { HmppsUser } from '../../../../interfaces/hmppsUser'

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

    const enrichedVisitors = await Promise.all(
      (visit.officialVisitors || []).map(async visitor => {
        const contact = contacts?.find(
          c => c.contactId === visitor.contactId && c.relationshipToPrisonerCode === visitor.relationshipCode,
        )

        const validRelationship =
          visitor.prisonerContactId && (await this.testValidRelationship(visitor.prisonerContactId, user))

        return {
          ...visitor,
          issues: {
            noRelationship: !contact,
            notApproved: contact ? !contact.isApprovedVisitor : false,
            socialVisitor: !prisonAllowsSocialVisitors(req) && visitor.relationshipTypeCode === 'SOCIAL',
          },
          restrictionSummary: contact?.restrictionSummary || { active: [] as RestrictionSummary[] },
          relationshipUrl: validRelationship
            ? `${config.serviceUrls.prisonerContacts}/prisoner/${visit.prisonerVisited.prisonerNumber}/contacts/manage/${visitor.contactId}/relationship/${visitor.prisonerContactId}`
            : `${config.serviceUrls.prisonerContacts}/prisoner/${visit.prisonerVisited.prisonerNumber}/contacts/list`,
        }
      }),
    )

    const hasIssueVisitors = enrichedVisitors.some(v => Object.values(v.issues).some(o => o))
    const hasNoRelationshipVisitors = enrichedVisitors.some(v => v.issues.noRelationship)
    const hasNotApprovedVisitors = enrichedVisitors.some(v => v.issues.notApproved)
    const hasSocialVisitors = enrichedVisitors.some(v => v.issues.socialVisitor)
    const visitorActiveRestrictions = enrichedVisitors.reduce(
      (acc, visitor) => acc + (visitor.restrictionSummary?.active?.length || 0),
      0,
    )
    const prisonerActiveRestrictions =
      restrictions?.content?.filter(o => !o.expiryDate || isFuture(new Date(o.expiryDate))).length || 0

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

    if (shouldShowInterruptPage(hasIssueVisitors, req, visit)) {
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
      activeRestrictions: visitorActiveRestrictions + prisonerActiveRestrictions,
      hasNoRelationshipVisitors,
      hasNotApprovedVisitors,
      hasSocialVisitors,
      hasIssueVisitors,
      shouldShowIssues: isFuture(new Date(`${visit.visitDate} ${visit.startTime}`)) && !visit.completionCode,
    })
  }

  async testValidRelationship(prisonerContactId: number, user: HmppsUser) {
    try {
      await this.personalRelationshipsService.getPrisonerContactRelationship(prisonerContactId, user)
      return true
    } catch {
      return false
    }
  }
}

function shouldShowInterruptPage(hasIssueVisitors: boolean, req: Request, visit: OfficialVisit) {
  const pastVisit = !isFuture(new Date(`${visit.visitDate} ${visit.startTime}`))
  if (req.query.continue || visit.completionCode || pastVisit) {
    return false
  }

  return hasIssueVisitors
}
