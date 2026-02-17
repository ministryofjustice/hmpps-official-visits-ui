import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema, SchemaType } from './assistanceRequiredSchema'
import { ApprovedContact, ContactRelationship } from '../../../../../@types/officialVisitsApi/types'
import { socialVisitorsPageEnabled } from '../../../../../utils/utils'
import TelemetryService from '../../../../../services/telemetryService'

export default class AssistanceRequiredHandler implements PageHandler {
  public PAGE_NAME = Page.ASSISTANCE_REQUIRED_PAGE

  constructor(private readonly telemetryService: TelemetryService) {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const { officialVisit } = req.session.journey
    const contacts = [...officialVisit.officialVisitors, ...(officialVisit.socialVisitors || [])].filter(
      o => o.prisonerContactId,
    )

    this.telemetryService.trackEvent('OFFICIAL_VISIT_MANAGE_ASSISTANCE_REQUIRED_VIEWED', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    res.render('pages/manage/assistanceRequired', {
      contacts,
      backUrl: socialVisitorsPageEnabled(req as Request) ? `select-social-visitors` : `select-official-visitors`,
      prisoner: officialVisit.prisoner,
    })
  }

  public POST = async (req: Request<unknown, unknown, SchemaType>, res: Response) => {
    const { officialVisit } = req.session.journey
    const { user } = res.locals
    officialVisit.officialVisitors = getSelected(officialVisit.officialVisitors, req.body as ContactRelationship[])
    officialVisit.socialVisitors = getSelected(officialVisit.socialVisitors, req.body as ContactRelationship[])

    officialVisit.assistancePageCompleted = true
    this.telemetryService.trackEvent('OFFICIAL_VISIT_MANAGE_ASSISTANCE_REQUIRED_UPDATED', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
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
