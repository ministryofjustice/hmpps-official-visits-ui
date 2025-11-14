import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'

export default class AssistanceRequiredHandler implements PageHandler {
  public PAGE_NAME = Page.ASSISTANCE_REQUIRED_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    // TODO: Page is still in refinement, but will need to gather data at a contact level
    // I speculate that we'll show a page with checkboxes for each contact, and a text box reveal for each to add notes

    const contacts = [
      ...req.session.journey.officialVisit.socialVisitors,
      ...req.session.journey.officialVisit.officialVisitors,
    ]

    res.render('pages/manage/assistanceRequired', {
      contacts,
      backUrl: `select-social-visitors`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    // TODO: Map notes back to each contact. body will contain notes as "note-contactId"
    const contacts = [
      ...(req.session.journey.officialVisit.socialVisitors || []),
      ...(req.session.journey.officialVisit.officialVisitors || []),
    ]

    // TODO: Zod schema will make this when validation is added
    if (typeof req.body.assistanceRequired === 'string') {
      req.body.assistanceRequired = [req.body.assistanceRequired]
    }

    contacts.forEach(contact => {
      const formKey = `note-${contact.id}`
      // eslint-disable-next-line no-param-reassign
      contact.assistedVisit = !!req.body.assistanceRequired.find((o: string) => Number(o) === contact.id)
      // eslint-disable-next-line no-param-reassign
      contact.assistanceNotes = contact.assistedVisit ? req.body[formKey] : ''
    })

    return res.redirect(`equipment`)
  }
}
