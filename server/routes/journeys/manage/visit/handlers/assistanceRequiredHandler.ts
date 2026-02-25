import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema, SchemaType } from './assistanceRequiredSchema'
import { ApprovedContact, ContactRelationship } from '../../../../../@types/officialVisitsApi/types'
import { socialVisitorsPageEnabled } from '../../../../../utils/utils'
import { getBackLink } from './utils'

export default class AssistanceRequiredHandler implements PageHandler {
  public PAGE_NAME = Page.ASSISTANCE_REQUIRED_PAGE

  constructor() {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    const contacts = [
      ...req.session.journey.officialVisit.officialVisitors,
      ...(req.session.journey.officialVisit.socialVisitors || []),
    ].filter(o => o.prisonerContactId)

    res.render('pages/manage/assistanceRequired', {
      contacts,
      backUrl: getBackLink(
        req,
        res,
        socialVisitorsPageEnabled(req as Request) ? `select-social-visitors` : `select-official-visitors`,
      ),
      prisoner: req.session.journey.officialVisit.prisoner,
      isChange: res.locals.mode === 'amend' && req.session.journey.amendVisit?.changePage === 'assistance-required',
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    officialVisit.officialVisitors = getSelected(officialVisit.officialVisitors, req.body as ContactRelationship[])
    officialVisit.socialVisitors = getSelected(officialVisit.socialVisitors, req.body as ContactRelationship[])

    officialVisit.assistancePageCompleted = true
    if (res.locals.mode === 'amend' && req.session.journey.amendVisit?.changePage === 'assistance-required') {
      // TODO: API call for amending visitors
      req.flash('updateVerb', 'amended')
      return res.redirect(`/manage/amend/${req.params.ovId}/${req.params.journeyId}`)
    }
    return res.redirect(officialVisit.visitType === 'IN_PERSON' ? `equipment` : `comments`)
  }
}

const getSelected = (contacts: ApprovedContact[], body: ContactRelationship[]) => {
  return (contacts || []).map(contact => {
    const foundContact = body.find(o => o.prisonerContactId === contact.prisonerContactId)
    return {
      ...contact,
      assistanceNotes: foundContact?.assistanceNotes,
      assistedVisit: foundContact?.assistedVisit || false,
    }
  })
}
