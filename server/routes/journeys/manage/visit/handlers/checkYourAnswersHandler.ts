import { NextFunction, Request, Response } from 'express'
import { isFuture } from 'date-fns'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { cyaGuard } from '../createJourneyState'

export default class CheckYourAnswersHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_YOUR_ANSWERS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response, _next?: NextFunction) => {
    const { officialVisit } = req.session.journey
    const { prisoner } = officialVisit

    const rawErrors = req.flash('alertErrors')[0]
    const errors = rawErrors ? JSON.parse(rawErrors) : {}

    const visitorActiveRestrictions = [...officialVisit.officialVisitors, ...officialVisit.socialVisitors].reduce(
      (acc, contact) => acc + (contact.restrictionSummary?.totalActive || 0),
      0,
    )
    const prisonerActiveRestrictions = prisoner.restrictions.filter(
      o => !o.expiryDate || isFuture(new Date(o.expiryDate)),
    ).length

    req.session.journey.reachedCheckAnswers = true
    return res.render('pages/manage/checkYourAnswers', {
      visit: officialVisit,
      contacts: [...officialVisit.officialVisitors, ...officialVisit.socialVisitors],
      prisoner,
      checks: errors,
      activeRestrictions: visitorActiveRestrictions + prisonerActiveRestrictions,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { user } = res.locals
    const { mode } = req.routeContext
    const visit = req.session.journey.officialVisit

    const errors = await cyaGuard(req, res, this.officialVisitsService)

    if (Object.keys(errors).length > 0) {
      return res.alertValidationError(errors)
    }

    if (mode === 'create') {
      const response = await this.officialVisitsService.createVisit(visit, user)
      return res.redirect(`confirmation/${response.officialVisitId}`)
    }

    return res.redirect(`confirmation`)
  }
}
