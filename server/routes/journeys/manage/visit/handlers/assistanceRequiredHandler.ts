import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { schema, SchemaType } from './assistanceRequiredSchema'
import { ContactRelationship } from '../../../../../@types/officialVisitsApi/types'

export default class AssistanceRequiredHandler implements PageHandler {
  public PAGE_NAME = Page.ASSISTANCE_REQUIRED_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    const contacts = [
      ...req.session.journey.officialVisit.socialVisitors,
      ...req.session.journey.officialVisit.officialVisitors,
    ].filter(o => o.prisonerContactId)

    res.render('pages/manage/assistanceRequired', {
      contacts,
      backUrl: `select-social-visitors`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request<unknown, unknown, SchemaType>, res: Response) => {
    const contacts = [
      ...req.session.journey.officialVisit.socialVisitors,
      ...req.session.journey.officialVisit.officialVisitors,
    ].filter(o => o.prisonerContactId)

    ;(req.body as ContactRelationship[]).forEach(contact => {
      const foundContact = contacts.find(o => o.prisonerContactId === contact.prisonerContactId)
      if (foundContact) {
        foundContact.assistanceNotes = contact.assistanceNotes
        foundContact.assistedVisit = contact.assistedVisit
      }
    })
    return res.redirect(
      req.session.journey.officialVisit.visitType === 'IN_PERSON' ? `equipment` : `check-your-answers`,
    )
  }
}
