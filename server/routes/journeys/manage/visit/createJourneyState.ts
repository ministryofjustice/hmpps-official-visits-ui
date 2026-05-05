/* eslint-disable no-param-reassign */
import { Request, Response } from 'express'
import { Journey } from '../../../../@types/express'
import {
  ApprovedContact,
  AvailableSlot,
  OverlappingVisitsResponse,
  ReferenceDataItem,
  VisitType,
} from '../../../../@types/officialVisitsApi/types'
import { Page } from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { JourneyPrisoner, JourneyVisitor } from './journey'

const progressTrackerPages: Record<string, number> = {
  [Page.PRISONER_SEARCH_PAGE]: 0,
  [Page.PRISONER_SELECT_PAGE]: 0,
  [Page.VISIT_TYPE_PAGE]: 1,
  [Page.TIME_SLOT_PAGE]: 1,
  [Page.SELECT_OFFICIAL_VISITORS_PAGE]: 2,
  [Page.SELECT_SOCIAL_VISITORS_PAGE]: 2,
  [Page.ASSISTANCE_REQUIRED_PAGE]: 3,
  [Page.EQUIPMENT_PAGE]: 3,
  [Page.COMMENTS_PAGE]: 3,
  [Page.CHECK_YOUR_ANSWERS_PAGE]: 4,
}

export function getProgressTrackerState(page: Page) {
  return progressTrackerPages[page] || 0
}

export function savePrisonerSelection(journey: Journey, prisoner: JourneyPrisoner) {
  // Reassigning the object deletes anything else that might have been previously saved (restarting the journey)
  journey.officialVisit = {
    searchPage: journey.officialVisit.searchPage,
    searchTerm: journey.officialVisit.searchTerm,
    prisonCode: prisoner.prisonCode,
    prisonName: prisoner.prisonName,
    prisoner,
  }
}

export function saveVisitType(journey: Journey, visitType: ReferenceDataItem) {
  journey.officialVisit.visitType = visitType.code as VisitType
  journey.officialVisit.visitTypeDescription = visitType.description
  delete journey.officialVisit.selectedTimeSlot
  delete journey.officialVisit.locationDescription
}

export function saveTimeSlot(journey: Journey, timeSlot: AvailableSlot) {
  journey.officialVisit.selectedTimeSlot = timeSlot
  journey.officialVisit.locationDescription = timeSlot.locationDescription
}

export function saveVisitors(journey: Journey, relationshipType: 'O' | 'S', visitors: JourneyVisitor[]) {
  if (relationshipType === 'O') {
    journey.officialVisit.officialVisitors = visitors
    delete journey.officialVisit.socialVisitorsPageCompleted
  } else {
    journey.officialVisit.socialVisitors = visitors
  }
}

/**
 * Restore any saved equipment and assistance notes for a contact from session data into a fresh contact object
 */
export function recallContacts(journey: Journey, relationshipType: 'O' | 'S', contacts: ApprovedContact[]) {
  const existing =
    relationshipType === 'O' ? journey.officialVisit.officialVisitors : journey.officialVisit.socialVisitors
  return contacts.map(contact => {
    const existingContact = (existing || []).find(
      v => v.contactId === contact.contactId && v.relationshipToPrisonerCode === contact.relationshipToPrisonerCode,
    )
    return {
      ...contact,
      assistanceNotes: existingContact?.assistanceNotes,
      equipmentNotes: existingContact?.equipmentNotes,
      assistedVisit: existingContact?.assistedVisit,
      equipment: existingContact?.equipment,
      officialVisitorId: existingContact?.officialVisitorId,
      alreadyOnVisit: existingContact?.alreadyOnVisit || false,
    } as JourneyVisitor
  })
}

export function checkSlotCapacity(slot: AvailableSlot, visitType: VisitType, visitorCount: number): boolean {
  if (visitType === 'VIDEO') {
    return slot.availableVideoSessions > 0
  }
  if (visitType === 'TELEPHONE') {
    return slot.availableGroups > 0 && slot.availableAdults > 0
  }
  if (visitType === 'IN_PERSON') {
    return slot.availableAdults >= visitorCount && slot.availableGroups > 0
  }
  return true // Skip check if unknown visit type
}

export function filterAvailableSlots(
  slots: AvailableSlot[],
  visitType: VisitType,
  visitorCount: number,
): AvailableSlot[] {
  return slots.filter(slot => checkSlotCapacity(slot, visitType, visitorCount))
}

export function hasPrisonerOverlap(overlapResponse: OverlappingVisitsResponse): boolean {
  return overlapResponse.overlappingPrisonerVisits.length > 0
}

export function hasVisitorOverlap(overlapResponse: OverlappingVisitsResponse): boolean {
  return overlapResponse.contacts.some(contact => contact.overlappingContactVisits.length > 0)
}

export async function checkTimeSlotCapacity(req: Request, res: Response, ovService: OfficialVisitsService) {
  const { officialVisit } = req.session.journey
  const selectedSlot = officialVisit.selectedTimeSlot

  if (!selectedSlot) {
    return false
  }

  const availableSlots = await ovService.getAvailableSlots(
    res,
    officialVisit.prisoner.prisonCode,
    selectedSlot.visitDate,
    selectedSlot.visitDate,
    officialVisit.visitType === 'VIDEO',
    officialVisit.officialVisitId,
  )

  const currentSlot = availableSlots.find(slot => slot.visitSlotId === selectedSlot.visitSlotId)

  if (!currentSlot) {
    return false
  }

  const totalVisitors = [...(officialVisit.officialVisitors || []), ...(officialVisit.socialVisitors || [])].length

  return checkSlotCapacity(currentSlot, officialVisit.visitType, totalVisitors)
}

export function checkForDuplicateContactIds(
  officialVisitors: ApprovedContact[],
  socialVisitors: ApprovedContact[],
): boolean {
  const allContactIds = [...officialVisitors, ...socialVisitors].map(visitor => visitor.contactId)
  const uniqueContactIds = new Set(allContactIds)
  return allContactIds.length !== uniqueContactIds.size
}

export async function cyaGuard(req: Request, res: Response, ovService: OfficialVisitsService) {
  const visit = req.session.journey.officialVisit

  // If no time slot selected, skip capacity and overlap checks
  if (!visit.selectedTimeSlot) {
    const hasDuplicateContactIds = checkForDuplicateContactIds(visit.officialVisitors || [], visit.socialVisitors || [])

    const errors: Record<string, boolean> = {}

    if (hasDuplicateContactIds) {
      errors['hasDuplicateContactIds'] = true
    }

    return errors
  }

  const capacityCheckResult = await checkTimeSlotCapacity(req, res, ovService)
  const hasDuplicateContactIds = checkForDuplicateContactIds(visit.officialVisitors || [], visit.socialVisitors || [])

  const overlapResult = await ovService.checkForOverlappingVisits(
    visit.prisoner.prisonCode,
    visit.prisoner.prisonerNumber,
    visit.selectedTimeSlot.visitDate,
    visit.selectedTimeSlot.startTime.split(':').slice(0, 2).join(':'),
    visit.selectedTimeSlot.endTime.split(':').slice(0, 2).join(':'),
    [...(visit.officialVisitors || []), ...(visit.socialVisitors || [])].map(v => v.contactId),
    visit.officialVisitId || 0,
    res.locals.user,
  )

  const prisonerOverlap = hasPrisonerOverlap(overlapResult)
  const visitorOverlap = hasVisitorOverlap(overlapResult)
  const errors: Record<string, boolean> = {}

  if (!capacityCheckResult) {
    errors['noCapacity'] = true
  }

  if (hasDuplicateContactIds) {
    errors['hasDuplicateContactIds'] = true
  }

  if (prisonerOverlap) {
    errors['hasPrisonerOverlap'] = true
  }

  if (visitorOverlap) {
    errors['hasVisitorOverlap'] = true
  }

  return errors
}
