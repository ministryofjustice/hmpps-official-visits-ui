/* eslint-disable no-param-reassign */
import { Journey } from '../../../../@types/express'
import {
  ApprovedContact,
  AvailableSlot,
  ReferenceDataItem,
  VisitType,
} from '../../../../@types/officialVisitsApi/types'
import { Page } from '../../../../services/auditService'
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
    } as JourneyVisitor
  })
}

export function checkVideoCapacity(slot: AvailableSlot): boolean {
  return slot.availableVideoSessions > 0
}

export function checkTelephoneCapacity(slot: AvailableSlot): boolean {
  return slot.availableGroups > 0 && slot.availableAdults > 0
}

export function checkInPersonCapacity(slot: AvailableSlot, visitorCount: number): boolean {
  return slot.availableAdults >= visitorCount && slot.availableGroups > 0
}

export function checkSlotCapacity(slot: AvailableSlot, visitType: VisitType, visitorCount: number): boolean {
  if (visitType === 'VIDEO') {
    return checkVideoCapacity(slot)
  }
  if (visitType === 'TELEPHONE') {
    return checkTelephoneCapacity(slot)
  }
  if (visitType === 'IN_PERSON') {
    return checkInPersonCapacity(slot, visitorCount)
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
