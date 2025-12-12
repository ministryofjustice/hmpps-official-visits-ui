import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import logger from '../../../../../../logger'

export default class CheckYourAnswersHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_YOUR_ANSWERS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    const { prisoner } = officialVisit

    logger.info(`CYA session is ${JSON.stringify(officialVisit, null, 2)}`)

    req.session.journey.reachedCheckAnswers = true
    return res.render('pages/manage/checkYourAnswers', {
      visit: officialVisit,
      contacts: [...officialVisit.officialVisitors, ...officialVisit.socialVisitors],
      prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { user } = res.locals
    const { mode } = req.routeContext

    const visit = req.session.journey.officialVisit
    const timeSlot = visit.selectedTimeSlot

    // TODO: Re-check this slot is still available
    // TODO: Re-check number of visitors still fit into the available capacity of the slot
    // Has someone else booked the slot whilst the user has been completing the journey?

    if (mode === 'create') {
      const response = await this.officialVisitsService.createVisit(visit, user)
      return res.redirect(`confirmation/${response.officialVisitId}`)
    }

    if (mode === 'amend') {
      await this.officialVisitsService.amendVisit(visit, user)
    }

    return res.redirect(`confirmation`)
  }
}
