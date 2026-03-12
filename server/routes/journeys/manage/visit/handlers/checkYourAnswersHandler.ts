import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { checkSlotCapacity } from '../createJourneyState'

export default class CheckYourAnswersHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_YOUR_ANSWERS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    const { prisoner } = officialVisit

    req.session.journey.reachedCheckAnswers = true

    // Perform capacity check before showing CYA page
    const capacityCheckResult = await this.performCapacityCheck(req, res)

    return res.render('pages/manage/checkYourAnswers', {
      visit: officialVisit,
      contacts: [...officialVisit.officialVisitors, ...officialVisit.socialVisitors],
      prisoner,
      capacityCheck: capacityCheckResult,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { user } = res.locals
    const { mode } = req.routeContext
    const visit = req.session.journey.officialVisit

    // Re-check this slot is still available and has capacity
    const capacityCheckResult = await this.performCapacityCheck(req, res)

    if (!capacityCheckResult) {
      // If capacity check fails, re-render CYA page with error
      return res.render('pages/manage/checkYourAnswers', {
        visit,
        contacts: [...visit.officialVisitors, ...visit.socialVisitors],
        prisoner: visit.prisoner,
        capacityCheck: capacityCheckResult,
      })
    }

    if (mode === 'create') {
      const response = await this.officialVisitsService.createVisit(visit, user)
      return res.redirect(`confirmation/${response.officialVisitId}`)
    }

    return res.redirect(`confirmation`)
  }

  private async performCapacityCheck(req: Request, res: Response) {
    const { officialVisit } = req.session.journey
    const selectedSlot = officialVisit.selectedTimeSlot

    if (!selectedSlot) {
      return false
    }

    // Get the latest available slots for the prison and date
    const availableSlots = await this.officialVisitsService.getAvailableSlots(
      res,
      officialVisit.prisonCode,
      selectedSlot.visitDate,
      selectedSlot.visitDate,
      officialVisit.visitType === 'VIDEO',
    )

    // Handle case where availableSlots is undefined or null
    if (!availableSlots || !Array.isArray(availableSlots)) {
      return false
    }

    // Find the selected slot from the available slots
    const currentSlot = availableSlots.find(slot => slot.visitSlotId === selectedSlot.visitSlotId)

    if (!currentSlot) {
      return false
    }

    // Count total visitors
    const totalVisitors = [...officialVisit.officialVisitors, ...officialVisit.socialVisitors].length

    // Perform capacity check using extracted function
    return checkSlotCapacity(currentSlot, officialVisit.visitType, totalVisitors)
  }
}
