import { NextFunction, Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { ContactRelationship } from '../../../../../@types/officialVisitsApi/types'
import { getBackLink, saveAmendedVisitors } from './utils'
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

    res.render('pages/manage/visitorDetails', {
      contacts,
      backUrl: getBackLink(req, res, `assistance-required`),
      prisoner: officialVisit.prisoner,
      submitAction: shouldSave(req, res) ? 'Save' : 'Continue',
      checks: errors,
      visitId: req.params.ovId,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    officialVisit.officialVisitors = setNotes(officialVisit.officialVisitors, req.body as ContactRelationship[])
    officialVisit.socialVisitors = setNotes(officialVisit.socialVisitors, req.body as ContactRelationship[])

    if (res.locals.mode === 'amend') {
      if (shouldSave(req, res)) {
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

const shouldSave = (req: Request, res: Response) => {
  const { officialVisit } = req.session.journey
  return res.locals.mode === 'amend' && (isAssistanceChange(req) || !isInPersonVisit(officialVisit))
}

const setNotes = (contacts: JourneyVisitor[], body: ContactRelationship[]) => {
  return (contacts || []).map(contact => {
    const foundContact = body.find(o => o.contactId === contact.contactId)
    return { ...contact, assistanceNotes: foundContact?.assistanceNotes }
  })
}
