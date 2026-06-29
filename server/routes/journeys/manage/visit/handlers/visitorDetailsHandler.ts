import { NextFunction, Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { ContactRelationship, OfficialVisitor, VisitorType } from '../../../../../@types/officialVisitsApi/types'
import { getBackLink } from './utils'
import { schema } from './visitorDetailsSchema'
import { cyaGuard } from '../createJourneyState'
import { JourneyVisitor, OfficialVisitJourney } from '../journey'

export default class VisitorDetailsHandler implements PageHandler {
  public PAGE_NAME = Page.VISITOR_DETAILS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  public GET = async (req: Request, res: Response, _next?: NextFunction) => {
    const { officialVisit } = req.session.journey

    const contacts = [...officialVisit.officialVisitors, ...(officialVisit.socialVisitors || [])].filter(
      o => o.contactId,
    )

    const rawErrors = req.flash('alertErrors')[0]
    const errors = rawErrors ? JSON.parse(rawErrors) : {}

    const willSave = res.locals.mode === 'amend' && (isAssistanceChange(req) || !isInPersonVisit(officialVisit))

    res.render('pages/manage/visitorDetails', {
      contacts,
      backUrl: getBackLink(req, res, `assistance-required`),
      prisoner: officialVisit.prisoner,
      submitAction: willSave ? 'Save' : 'Continue',
      checks: errors,
      visitId: req.params.ovId,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    officialVisit.officialVisitors = setNotes(officialVisit.officialVisitors, req.body as ContactRelationship[])
    officialVisit.socialVisitors = setNotes(officialVisit.socialVisitors, req.body as ContactRelationship[])

    if (res.locals.mode === 'amend') {
      if (isAssistanceChange(req) || !isInPersonVisit(officialVisit)) {
        const errors = await cyaGuard(req, res, this.officialVisitsService)
        if (Object.keys(errors).length > 0) {
          return res.alertValidationError(errors)
        }
        return saveAmendedVisitors(req, res, this.officialVisitsService)
      }
      return res.redirect('equipment')
    }

    return res.redirect(isInPersonVisit(officialVisit) ? `equipment` : `comments`)
  }
}

const isInPersonVisit = (officialVisit: OfficialVisitJourney) => {
  return officialVisit.visitType === 'IN_PERSON'
}

const isAssistanceChange = (req: Request) => {
  const change = req.session.journey.amendVisit?.changePage
  return change === 'assistance-required' || change === 'visitor-details'
}

const saveAmendedVisitors = async (
  req: Request,
  res: Response,
  officialVisitsService: OfficialVisitsService,
) => {
  const { officialVisit } = req.session.journey
  const allVisitors = [...(officialVisit.officialVisitors || []), ...(officialVisit.socialVisitors || [])]
  const officialVisitors: OfficialVisitor[] = allVisitors.map(visitor => ({
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
  const ovId = req.params.ovId as string
  const journeyId = req.params.journeyId as string
  await officialVisitsService.updateVisitors(officialVisit.prisonCode, ovId, { officialVisitors }, res.locals.user)
  req.flash('updateVerb', 'amended')
  return res.redirect(`/manage/amend/${ovId}/${journeyId}`)
}

const setNotes = (contacts: JourneyVisitor[], body: ContactRelationship[]) => {
  return (contacts || []).map(contact => {
    const foundContact = body.find(o => o.contactId === contact.contactId)
    if (!foundContact) {
      return contact
    }
    return {
      ...contact,
      assistanceNotes: foundContact.assistanceNotes,
    }
  })
}
