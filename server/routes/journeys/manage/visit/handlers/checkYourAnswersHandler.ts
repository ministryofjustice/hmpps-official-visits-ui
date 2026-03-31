import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { checkSlotCapacity, hasPrisonerOverlap, hasVisitorOverlap } from '../createJourneyState'
import { ApprovedContact } from '../../../../../@types/officialVisitsApi/types'

export default class CheckYourAnswersHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_YOUR_ANSWERS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  private checkForDuplicateContactIds(officialVisitors: ApprovedContact[], socialVisitors: ApprovedContact[]): boolean {
    const allContactIds = [...officialVisitors, ...socialVisitors].map(visitor => visitor.contactId)
    const uniqueContactIds = new Set(allContactIds)
    return allContactIds.length !== uniqueContactIds.size
  }

  public GET = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    const { prisoner } = officialVisit

    req.session.journey.reachedCheckAnswers = true

    const capacityCheckResult = await this.checkSlotCapacity(req, res)
    const hasDuplicateContactIds = this.checkForDuplicateContactIds(
      officialVisit.officialVisitors || [],
      officialVisit.socialVisitors || [],
    )

    let prisonerOverlap = false
    let visitorOverlap = false
    if (officialVisit.selectedTimeSlot) {
      const overlapResult = await this.officialVisitsService.checkForOverlappingVisits(
        officialVisit.prisoner.prisonCode,
        officialVisit.prisoner.prisonerNumber,
        officialVisit.selectedTimeSlot.visitDate,
        officialVisit.selectedTimeSlot.startTime,
        officialVisit.selectedTimeSlot.endTime,
        [...(officialVisit.officialVisitors || []), ...(officialVisit.socialVisitors || [])].map(v => v.contactId),
        0, // existingOfficialVisitId - 0 for new visits
        res.locals.user,
      )
      prisonerOverlap = hasPrisonerOverlap(overlapResult)
      visitorOverlap = hasVisitorOverlap(overlapResult)
    }

    return res.render('pages/manage/checkYourAnswers', {
      visit: officialVisit,
      contacts: [...officialVisit.officialVisitors, ...officialVisit.socialVisitors],
      prisoner,
      capacityCheck: capacityCheckResult,
      hasDuplicateContactIds,
      hasScheduleOverlap: prisonerOverlap,
      hasVisitorOverlap: visitorOverlap,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { user } = res.locals
    const { mode } = req.routeContext
    const visit = req.session.journey.officialVisit

    const capacityCheckResult = await this.checkSlotCapacity(req, res)
    const hasDuplicateContactIds = this.checkForDuplicateContactIds(
      visit.officialVisitors || [],
      visit.socialVisitors || [],
    )

    const overlapResult = await this.officialVisitsService.checkForOverlappingVisits(
      visit.prisoner.prisonCode,
      visit.prisoner.prisonerNumber,
      visit.selectedTimeSlot.visitDate,
      visit.selectedTimeSlot.startTime,
      visit.selectedTimeSlot.endTime,
      [...(visit.officialVisitors || []), ...(visit.socialVisitors || [])].map(v => v.contactId),
      0,
      res.locals.user,
    )

    const prisonerOverlap = hasPrisonerOverlap(overlapResult)
    const visitorOverlap = hasVisitorOverlap(overlapResult)

    if (!capacityCheckResult) {
      return res.render('pages/manage/checkYourAnswers', {
        visit,
        contacts: [...visit.officialVisitors, ...visit.socialVisitors],
        prisoner: visit.prisoner,
        capacityCheck: capacityCheckResult,
        hasDuplicateContactIds,
        hasScheduleOverlap: prisonerOverlap,
        hasVisitorOverlap: visitorOverlap,
      })
    }

    if (hasDuplicateContactIds) {
      return res.render('pages/manage/checkYourAnswers', {
        visit,
        contacts: [...visit.officialVisitors, ...visit.socialVisitors],
        prisoner: visit.prisoner,
        capacityCheck: capacityCheckResult,
        hasDuplicateContactIds,
        hasScheduleOverlap: prisonerOverlap,
        hasVisitorOverlap: visitorOverlap,
      })
    }

    if (prisonerOverlap || visitorOverlap) {
      return res.render('pages/manage/checkYourAnswers', {
        visit,
        contacts: [...visit.officialVisitors, ...visit.socialVisitors],
        prisoner: visit.prisoner,
        capacityCheck: capacityCheckResult,
        hasDuplicateContactIds,
        hasScheduleOverlap: prisonerOverlap,
        hasVisitorOverlap: visitorOverlap,
      })
    }

    if (mode === 'create') {
      const response = await this.officialVisitsService.createVisit(visit, user)
      return res.redirect(`confirmation/${response.officialVisitId}`)
    }

    return res.redirect(`confirmation`)
  }

  private async checkSlotCapacity(req: Request, res: Response) {
    const { officialVisit } = req.session.journey
    const selectedSlot = officialVisit.selectedTimeSlot

    if (!selectedSlot) {
      return false
    }

    const availableSlots = await this.officialVisitsService.getAvailableSlots(
      res,
      officialVisit.prisonCode,
      selectedSlot.visitDate,
      selectedSlot.visitDate,
      officialVisit.visitType === 'VIDEO',
    )

    const currentSlot = availableSlots.find(slot => slot.visitSlotId === selectedSlot.visitSlotId)

    if (!currentSlot) {
      return false
    }

    const totalVisitors = [...officialVisit.officialVisitors, ...officialVisit.socialVisitors].length

    return checkSlotCapacity(currentSlot, officialVisit.visitType, totalVisitors)
  }
}
