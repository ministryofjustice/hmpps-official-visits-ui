import { NextFunction, Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { ApprovedContact, ContactRelationship } from '../../../../../@types/officialVisitsApi/types'
import { getBackLink, saveAmendedVisitors } from './utils'
import { schema } from './equipmentSchema'
import { cyaGuard } from '../createJourneyState'

export default class EquipmentHandler implements PageHandler {
  public PAGE_NAME = Page.EQUIPMENT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response, _next?: NextFunction) => {
    const contacts = [
      ...req.session.journey.officialVisit.officialVisitors,
      ...(req.session.journey.officialVisit.socialVisitors || []),
    ].filter(o => o.contactId)

    const rawErrors = req.flash('alertErrors')[0]
    const errors = rawErrors ? JSON.parse(rawErrors) : {}

    res.render('pages/manage/equipment', {
      contacts,
      backUrl: getBackLink(req, res, `visitor-details`),
      prisoner: req.session.journey.officialVisit.prisoner,
      checks: errors,
      visitId: req.params.ovId,
    })
  }

  public BODY = schema

  public POST = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    officialVisit.officialVisitors = getSelected(officialVisit.officialVisitors, req.body)
    officialVisit.socialVisitors = getSelected(officialVisit.socialVisitors, req.body)

    req.session.journey.officialVisit.equipmentPageCompleted = true

    if (res.locals.mode === 'amend') {
      const errors = await cyaGuard(req, res, this.officialVisitsService)

      if (Object.keys(errors).length > 0) {
        return res.alertValidationError(errors)
      }
      return saveAmendedVisitors(req, res, this.officialVisitsService)
    }
    return res.redirect(`comments`)
  }
}

const getSelected = (contacts: ApprovedContact[], body: ContactRelationship[]) => {
  return (contacts || []).map(contact => {
    const foundContact = body.find(o => o.contactId === contact.contactId)
    return {
      ...contact,
      equipmentNotes: foundContact?.equipmentNotes,
      equipment: foundContact?.equipment,
    }
  })
}
