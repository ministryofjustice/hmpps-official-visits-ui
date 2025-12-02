import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { schema } from './equipmentSchema'
import { ContactRelationship } from '../../../../../@types/officialVisitsApi/types'

export default class EquipmentHandler implements PageHandler {
  public PAGE_NAME = Page.EQUIPMENT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const contacts = [
      ...req.session.journey.officialVisit.officialVisitors,
      ...req.session.journey.officialVisit.socialVisitors,
    ].filter(o => o.prisonerContactId)

    res.render('pages/manage/equipment', {
      contacts,
      backUrl: `assistance-required`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public BODY = schema

  public POST = async (req: Request, res: Response) => {
    const contacts = [
      ...req.session.journey.officialVisit.officialVisitors,
      ...req.session.journey.officialVisit.socialVisitors,
    ].filter(o => o.prisonerContactId)

    ;(req.body as ContactRelationship[]).forEach(contact => {
      const foundContact = contacts.find(o => o.prisonerContactId === contact.prisonerContactId)
      if (foundContact) {
        foundContact.equipmentNotes = contact.equipmentNotes
        foundContact.equipment = contact.equipment
      }
    })

    return res.redirect(`comments`)
  }
}
