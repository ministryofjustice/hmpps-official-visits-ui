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

    const capacityCheckResult = await this.checkSlotCapacity(req, res)

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

    const capacityCheckResult = await this.checkSlotCapacity(req, res)

    if (!capacityCheckResult) {
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
