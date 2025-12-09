import { Journey } from '../../../../@types/express'
import { ApprovedContact, AvailableSlot, ReferenceDataItem } from '../../../../@types/officialVisitsApi/types'
import { Page } from '../../../../services/auditService'
import { JourneyPrisoner, JourneyVisitor, OfficialVisitJourney } from './journey'

const pageData: { page: Page; keys: (keyof OfficialVisitJourney)[] }[] = [
  { page: Page.PRISONER_SEARCH_PAGE, keys: ['searchTerm'] },
  { page: Page.PRISONER_SELECT_PAGE, keys: ['prisoner', 'searchPage'] },
  { page: Page.VISIT_TYPE_PAGE, keys: ['visitType', 'visitTypeDescription'] },
  { page: Page.TIME_SLOT_PAGE, keys: ['selectedTimeSlot'] },
  { page: Page.SELECT_OFFICIAL_VISITORS_PAGE, keys: ['officialVisitors'] },
  { page: Page.SELECT_SOCIAL_VISITORS_PAGE, keys: ['socialVisitors', 'socialVisitorsPageCompleted'] },
  { page: Page.ASSISTANCE_REQUIRED_PAGE, keys: ['assistancePageCompleted'] },
  { page: Page.EQUIPMENT_PAGE, keys: ['equipmentPageCompleted'] },
  { page: Page.COMMENTS_PAGE, keys: ['prisonerNotes', 'commentsPageCompleted'] },
]

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
  journey.officialVisit.visitType = visitType.code
  journey.officialVisit.visitTypeDescription = visitType.description

  resetLaterPages(journey, Page.VISIT_TYPE_PAGE)
}

export function saveTimeSlot(journey: Journey, timeSlot: AvailableSlot) {
  journey.officialVisit.selectedTimeSlot = timeSlot

  resetLaterPages(journey, Page.TIME_SLOT_PAGE)
}

export function saveVisitors(journey: Journey, relationshipType: 'O' | 'S', visitors: JourneyVisitor[]) {
  if (relationshipType === 'O') {
    journey.officialVisit.officialVisitors = visitors
  } else {
    journey.officialVisit.socialVisitors = visitors
  }

  // Re-show assistance/equipment pages
  resetPages(journey, [Page.ASSISTANCE_REQUIRED_PAGE, Page.EQUIPMENT_PAGE])
}

export function recallContacts(journey: Journey, relationshipType: 'O' | 'S', contacts: ApprovedContact[]) {
  const existing =
    relationshipType === 'O' ? journey.officialVisit.officialVisitors : journey.officialVisit.socialVisitors
  return contacts.map(contact => {
    const existingContact = (existing || []).find(v => v.prisonerContactId === contact.prisonerContactId)
    return {
      ...contact,
      assistanceNotes: existingContact?.assistanceNotes,
      equipmentNotes: existingContact?.equipmentNotes,
      assistedVisit: existingContact?.assistedVisit,
      equipment: existingContact?.equipment,
    } as JourneyVisitor
  })
}

function resetLaterPages(journey: Journey, page: Page) {
  const pageIndex = pageData.findIndex(p => p.page === page) + 1
  pageData.slice(pageIndex).forEach(p => {
    p.keys.forEach(key => {
      delete journey.officialVisit[key]
    })
  })
  journey.reachedCheckAnswers = false
}

function resetPages(journey: Journey, pages: Page[]) {
  pages.forEach(page => {
    const foundPage = pageData.find(p => p.page === page)
    if (foundPage) {
      foundPage.keys.forEach(key => {
        delete journey.officialVisit[key]
      })
    }
  })
  journey.reachedCheckAnswers = false
}
