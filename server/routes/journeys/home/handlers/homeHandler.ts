import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import BookAVideoLinkService from '../../../../services/bookAVideoLinkService'
import TelemetryService from '../../../../services/telemetryService'
import { nomisSwitchOffEnabled } from '../../../../utils/utils'

export default class HomeHandler implements PageHandler {
  constructor(
    private readonly bookAVideoLinkService: BookAVideoLinkService,
    private readonly telemetryService: TelemetryService,
  ) {}

  public PAGE_NAME = Page.HOME_PAGE

  GET = async (req: Request, res: Response) => {
    res.locals.breadcrumbs.popLastItem()
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_HOME_PAGE', user, {})

    const showSwitchOffBanner = nomisSwitchOffEnabled(res.locals.user.activeCaseLoadId)

    let showBvlsBanner = false
    // We only want to make the call to BVLS if the switch off banner is to be shown
    if (showSwitchOffBanner) {
      const bvlsPrisonCodes = await this.bookAVideoLinkService
        .getPrisons(res.locals.user)
        .then(prisons => prisons.map(prison => prison.code))

      showBvlsBanner = bvlsPrisonCodes.includes(res.locals.user.activeCaseLoadId)
    }

    return res.render('pages/home/home', {
      showBreadcrumbs: true,
      showSwitchOffBanner,
      showBvlsBanner,
    })
  }
}
