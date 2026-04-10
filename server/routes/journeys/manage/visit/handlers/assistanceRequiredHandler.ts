import { NextFunction, Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { ApprovedContact, ContactRelationship, VisitorType } from '../../../../../@types/officialVisitsApi/types'
import { socialVisitorsPageEnabled } from '../../../../../utils/utils'
import { getBackLink } from './utils'
import { schema } from './assistanceRequiredSchema'
import { OfficialVisitJourney } from '../journey'
import { cyaGuard } from '../createJourneyState'

export default class AssistanceRequiredHandler implements PageHandler {
  public PAGE_NAME = Page.ASSISTANCE_REQUIRED_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  public GET = async (req: Request, res: Response, _next?: NextFunction) => {
    const contacts = [
      ...req.session.journey.officialVisit.officialVisitors,
      ...(req.session.journey.officialVisit.socialVisitors || []),
    ].filter(o => o.contactId)

    const { officialVisit } = req.session.journey
    const changeThisPage = req.session.journey.amendVisit?.changePage === 'assistance-required'

    const rawErrors = req.flash('alertErrors')[0]
    const errors = rawErrors ? JSON.parse(rawErrors) : {}

    res.render('pages/manage/assistanceRequired', {
      contacts,
      backUrl: getBackLink(
        req,
        res,
        socialVisitorsPageEnabled(req as Request) ? `select-social-visitors` : `select-official-visitors`,
      ),
      prisoner: req.session.journey.officialVisit.prisoner,
      submitAction:
        res.locals.mode === 'amend' && (changeThisPage || !equipmentPageEnabled(officialVisit)) ? 'Save' : 'Continue',
      checks: errors,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    officialVisit.officialVisitors = getSelected(officialVisit?.officialVisitors, req.body as ContactRelationship[])
    officialVisit.socialVisitors = getSelected(officialVisit?.socialVisitors, req.body as ContactRelationship[])

    officialVisit.assistancePageCompleted = true
    const changeThisPage = req.session.journey.amendVisit?.changePage === 'assistance-required'

    if (res.locals.mode === 'amend' && (changeThisPage || !equipmentPageEnabled(officialVisit))) {
      const errors = await cyaGuard(req, res, this.officialVisitsService)
      if (Object.keys(errors).length > 0) {
        return res.alertValidationError(errors)
      }

      const allVisitors = [...(officialVisit.officialVisitors || []), ...(officialVisit.socialVisitors || [])]
      const officialVisitors = allVisitors.map(visitor => ({
        officialVisitorId: visitor.officialVisitorId || 0,
        visitorTypeCode: 'CONTACT' as VisitorType,
        contactId: visitor.contactId,
        prisonerContactId: visitor.prisonerContactId,
        relationshipCode: visitor.relationshipToPrisonerCode,
        leadVisitor: visitor.leadVisitor,
        assistedVisit: visitor.assistedVisit,
        assistedNotes: visitor.assistanceNotes,
        ...(visitor.equipmentNotes ? { visitorEquipment: { description: visitor.equipmentNotes } } : {}),
      }))

      await this.officialVisitsService.updateVisitors(
        officialVisit.prisonCode,
        req.params.ovId,
        { officialVisitors },
        res.locals.user,
      )
      req.flash('updateVerb', 'amended')
      return res.redirect(`/manage/amend/${req.params.ovId}/${req.params.journeyId}`)
    }
    return res.redirect(equipmentPageEnabled(officialVisit) ? `equipment` : `comments`)
  }
}

const equipmentPageEnabled = (officialVisit: OfficialVisitJourney) => {
  return officialVisit.visitType === 'IN_PERSON'
}

const getSelected = (contacts: ApprovedContact[], body: ContactRelationship[]) => {
  return (contacts || []).map(contact => {
    const foundContact = body.find(o => o.contactId === contact.contactId)
    return {
      ...contact,
      assistanceNotes: foundContact?.assistanceNotes,
      assistedVisit: foundContact?.assistedVisit || false,
    }
  })
}
