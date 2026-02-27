import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema } from './equipmentSchema'
import { ApprovedContact, ContactRelationship } from '../../../../../@types/officialVisitsApi/types'
import { getBackLink } from './utils'

export default class EquipmentHandler implements PageHandler {
  public PAGE_NAME = Page.EQUIPMENT_PAGE

  constructor() {}

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
      // TODO: API call for amending visitors
      req.flash('updateVerb', 'amended')
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
