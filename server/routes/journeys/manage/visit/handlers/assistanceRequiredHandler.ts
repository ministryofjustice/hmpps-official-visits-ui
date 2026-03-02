import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import {
  ApprovedContact,
  ContactRelationship,
  OfficialVisitor,
  VisitorType,
} from '../../../../../@types/officialVisitsApi/types'
import { socialVisitorsPageEnabled } from '../../../../../utils/utils'
import { getBackLink } from './utils'
import { schema } from './assistanceRequiredSchema'

export default class AssistanceRequiredHandler implements PageHandler {
  public PAGE_NAME = Page.ASSISTANCE_REQUIRED_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

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
      try {
        const allVisitors = [...officialVisit.officialVisitors, ...(officialVisit.socialVisitors || [])]
        const officialVisitors = allVisitors.map(visitor => ({
          officialVisitorId: visitor.officialVisitorId,
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
      } catch (error) {
        req.flash('errors', 'Failed to update visitor assistance. Please try again.')
      }
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
