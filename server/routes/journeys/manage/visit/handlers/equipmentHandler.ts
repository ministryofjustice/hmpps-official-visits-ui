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
import { getBackLink } from './utils'
import { schema } from './equipmentSchema'

export default class EquipmentHandler implements PageHandler {
  public PAGE_NAME = Page.EQUIPMENT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const contacts = [
      ...req.session.journey.officialVisit.officialVisitors,
      ...(req.session.journey.officialVisit.socialVisitors || []),
    ].filter(o => o.prisonerContactId)

    res.render('pages/manage/equipment', {
      contacts,
      backUrl: getBackLink(req, res, `assistance-required`),
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public BODY = schema

  public POST = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    officialVisit.officialVisitors = getSelected(officialVisit.officialVisitors, req.body)
    officialVisit.socialVisitors = getSelected(officialVisit.socialVisitors, req.body)

    req.session.journey.officialVisit.equipmentPageCompleted = true

    if (res.locals.mode === 'amend') {
      try {
        const allVisitors = [...officialVisit.officialVisitors, ...(officialVisit.socialVisitors || [])]
        const officialVisitors: OfficialVisitor[] = allVisitors.map(visitor => ({
          officialVisitorId: visitor.officialVisitorId,
          visitorTypeCode: 'CONTACT',
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
        req.flash('errors', 'Failed to update visitor equipment. Please try again.')
      }
      return res.redirect(`/manage/amend/${req.params.ovId}/${req.params.journeyId}`)
    }
    return res.redirect(`comments`)
  }
}

const getSelected = (contacts: ApprovedContact[], body: ContactRelationship[]) => {
  return (contacts || []).map(contact => {
    const foundContact = body.find(o => o.prisonerContactId === contact.prisonerContactId)
    return {
      ...contact,
      equipmentNotes: foundContact?.equipmentNotes,
      equipment: foundContact?.equipment,
    }
  })
}
