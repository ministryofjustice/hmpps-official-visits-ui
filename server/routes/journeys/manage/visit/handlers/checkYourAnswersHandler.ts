import { NextFunction, Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { cyaGuard } from '../createJourneyState'

export default class CheckYourAnswersHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_YOUR_ANSWERS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) { }

  public GET = async (req: Request, res: Response, _next?: NextFunction, errors: Record<string, boolean> = {}) => {
    const { officialVisit } = req.session.journey
    const { prisoner } = officialVisit

    req.session.journey.reachedCheckAnswers = true
    return res.render('pages/manage/checkYourAnswers', {
      visit: officialVisit,
      contacts: [...officialVisit.officialVisitors, ...officialVisit.socialVisitors],
      prisoner,
      checks: errors
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { user } = res.locals
    const { mode } = req.routeContext
    const visit = req.session.journey.officialVisit

    const errors = await cyaGuard(req, res, this.officialVisitsService)

    if (Object.keys(errors).length > 0) {
      return this.GET(req, res, undefined, errors)
    }

    if (mode === 'create') {
      const response = await this.officialVisitsService.createVisit(visit, user)
      return res.redirect(`confirmation/${response.officialVisitId}`)
    }

    return res.redirect(`confirmation`)
  }
}
