import { Request, Response } from 'express'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { OfficialVisitor } from '../../../../../@types/officialVisitsApi/types'

export const getBackLink = (req: Request, res: Response, fallback: string) => {
  const change = req.session.journey.amendVisit?.changePage
  if (change) {
    return change === res.locals.currentPage ? `./` : fallback
  }
  return fallback
}

export const saveAmendedVisitors = async (
  req: Request,
  res: Response,
  officialVisitsService: OfficialVisitsService,
) => {
  const { officialVisit } = req.session.journey
  const { user } = res.locals
  const ovId = req.params.ovId as string
  const journeyId = req.params.journeyId as string

  const currentVisit = await officialVisitsService.getOfficialVisitById(Number(ovId), user)
  const currentIds = new Map(currentVisit.officialVisitors.map(v => [v.contactId, v.officialVisitorId]))

  const allVisitors = [...(officialVisit.officialVisitors || []), ...(officialVisit.socialVisitors || [])]
  const officialVisitors: OfficialVisitor[] = allVisitors.map(visitor => ({
    officialVisitorId: visitor.contactId ? currentIds.get(visitor.contactId) || 0 : visitor.officialVisitorId || 0,
    visitorTypeCode: 'CONTACT',
    contactId: visitor.contactId,
    prisonerContactId: visitor.prisonerContactId,
    relationshipCode: visitor.relationshipToPrisonerCode,
    leadVisitor: visitor.leadVisitor,
    assistedVisit: visitor.assistedVisit,
    assistedNotes: visitor.assistanceNotes,
    ...(visitor.equipmentNotes ? { visitorEquipment: { description: visitor.equipmentNotes } } : {}),
  }))

  await officialVisitsService.updateVisitors(officialVisit.prisonCode, ovId, { officialVisitors }, user)
  req.flash('updateVerb', 'updated')
  return res.redirect(`/manage/amend/${ovId}/${journeyId}`)
}
