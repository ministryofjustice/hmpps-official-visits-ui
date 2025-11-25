import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { schema } from './equipmentSchema'
import { Contact } from '../../../../../@types/officialVisitsApi/types'

export default class EquipmentHandler implements PageHandler {
  public PAGE_NAME = Page.EQUIPMENT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const contacts = [
      ...req.session.journey.officialVisit.socialVisitors,
      ...req.session.journey.officialVisit.officialVisitors,
    ]

    res.render('pages/manage/equipment', {
      contacts,
      backUrl: `assistance-required`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public BODY = schema

  public POST = async (req: Request, res: Response) => {
    const contacts = [
      ...req.session.journey.officialVisit.socialVisitors,
      ...req.session.journey.officialVisit.officialVisitors,
    ].filter(o => o.contactId)

    ;(req.body as Contact[]).forEach(contact => {
      const foundContact = contacts.find(o => o.contactId === contact.contactId)
      if (foundContact) {
        foundContact.equipmentNotes = contact.equipmentNotes
        foundContact.equipment = contact.equipment
      }
    })

    return res.redirect(`check-your-answers`)
  }
}
