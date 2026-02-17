import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import TelemetryService from '../../../../../services/telemetryService'

export default class CheckYourAnswersHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_YOUR_ANSWERS_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    const { prisoner } = officialVisit
    const { user } = res.locals

    req.session.journey.reachedCheckAnswers = true
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEWED', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
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

    // TODO: Re-check this slot is still available
    // TODO: Re-check number of visitors still fit into the available capacity of the slot
    // Has someone else booked the slot whilst the user has been completing the journey?

    if (mode === 'create') {
      const response = await this.officialVisitsService.createVisit(visit, user)
      this.telemetryService.trackEvent('OFFICIAL_VISIT_CREATED', user, {
        officialVisitId: visit.officialVisitId,
        prisonCode: visit.prisonCode,
      })
      return res.redirect(`confirmation/${response.officialVisitId}`)
    }

    if (mode === 'amend') {
      await this.officialVisitsService.amendVisit(visit, user)
      this.telemetryService.trackEvent('OFFICIAL_VISIT_UPDATED', user, {
        officialVisitId: visit.officialVisitId,
        prisonCode: visit.prisonCode,
      })
    }

    return res.redirect(`confirmation`)
  }
}
