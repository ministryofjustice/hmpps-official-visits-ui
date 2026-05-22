import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import TelemetryService from '../../../../services/telemetryService'
import { nomisSwitchOffEnabled } from '../../../../utils/utils'

export default class HomeHandler implements PageHandler {
  constructor(private readonly telemetryService: TelemetryService) { }

  public PAGE_NAME = Page.HOME_PAGE

  GET = async (req: Request, res: Response) => {
    res.locals.breadcrumbs.popLastItem()
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_HOME_PAGE', user, {})

    return res.render('pages/home/home', {
      showBreadcrumbs: true,
      showSwitchOffBanner: nomisSwitchOffEnabled(res.locals.user.activeCaseLoadId),
    })
  }
}
