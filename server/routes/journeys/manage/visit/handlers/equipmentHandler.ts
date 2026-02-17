import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { schema, SchemaType } from './equipmentSchema'
import { ApprovedContact, ContactRelationship } from '../../../../../@types/officialVisitsApi/types'
import TelemetryService from '../../../../../services/telemetryService'

export default class EquipmentHandler implements PageHandler {
  public PAGE_NAME = Page.EQUIPMENT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    const contacts = [...officialVisit.officialVisitors, ...(officialVisit.socialVisitors || [])].filter(
      o => o.prisonerContactId,
    )

    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VISITOR_EQUIPMENT_VIEWED', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    res.render('pages/manage/equipment', {
      contacts,
      backUrl: `assistance-required`,
      prisoner: officialVisit.prisoner,
    })
  }

  public BODY = schema

  public POST = async (req: Request<unknown, unknown, SchemaType>, res: Response) => {
    const { officialVisit } = req.session.journey
    officialVisit.officialVisitors = getSelected(officialVisit.officialVisitors, req.body)
    officialVisit.socialVisitors = getSelected(officialVisit.socialVisitors, req.body)

    req.session.journey.officialVisit.equipmentPageCompleted = true
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VISITOR_EQUIPMENT_UPDATED', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    return res.redirect(`comments`)
  }
}

const getSelected = (contacts: ApprovedContact[], body: ContactRelationship[]) => {
  return (contacts || [])
    .map(contact => {
      const foundContact = body.find(o => o.prisonerContactId === contact.prisonerContactId)
      return foundContact
        ? {
            ...contact,
            equipmentNotes: foundContact.equipmentNotes,
            equipment: foundContact.equipment,
          }
        : undefined
    })
    .filter(o => o)
}
