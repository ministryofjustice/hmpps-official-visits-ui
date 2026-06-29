import { NextFunction, Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { ContactRelationship } from '../../../../../@types/officialVisitsApi/types'
import { socialVisitorsPageEnabled } from '../../../../../utils/utils'
import { getBackLink } from './utils'
import { schema } from './assistanceRequiredSchema'
import { JourneyVisitor } from '../journey'

export default class AssistanceRequiredHandler implements PageHandler {
  public PAGE_NAME = Page.ASSISTANCE_REQUIRED_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  public GET = async (req: Request, res: Response, _next?: NextFunction) => {
    const contacts = [
      ...req.session.journey.officialVisit.officialVisitors,
      ...(req.session.journey.officialVisit.socialVisitors || []),
    ].filter(o => o.contactId)

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
      submitAction: 'Continue',
      checks: errors,
      visitId: req.params.ovId,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    officialVisit.officialVisitors = getSelected(officialVisit?.officialVisitors, req.body as ContactRelationship[])
    officialVisit.socialVisitors = getSelected(officialVisit?.socialVisitors, req.body as ContactRelationship[])

    officialVisit.assistancePageCompleted = true

    return res.redirect('visitor-details')
  }
}

const getSelected = (contacts: JourneyVisitor[], body: ContactRelationship[]) => {
  return (contacts || []).map(contact => {
    const foundContact = body.find(o => o.contactId === contact.contactId)
    return {
      ...contact,
      assistedVisit: foundContact?.assistedVisit || false,
    }
  })
}
