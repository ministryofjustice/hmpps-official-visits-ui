import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import TelemetryService from '../../../../services/telemetryService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { nomisSwitchOffEnabled } from '../../../../utils/utils'
import { Permission } from '../../../../interfaces/hmppsUser'
import { hasPerm } from '../../../../middleware/requirePermissions'
import logger from '../../../../../logger'

export default class HomeHandler implements PageHandler {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly officialVisitsService: OfficialVisitsService,
  ) {}

  public PAGE_NAME = Page.HOME_PAGE

  GET = async (req: Request, res: Response) => {
    res.locals.breadcrumbs.popLastItem()
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_HOME_PAGE', user, {})

    return res.render('pages/home/home', {
      showBreadcrumbs: true,
      showSwitchOffBanner: nomisSwitchOffEnabled(res.locals.user.activeCaseLoadId),
      visitsNeedReviewCount: await this.getVisitsNeedReviewCount(res),
    })
  }

  private async getVisitsNeedReviewCount(res: Response): Promise<number> {
    const { user, visitsNeedReviewEnabled } = res.locals
    if (!visitsNeedReviewEnabled || !hasPerm(user.permissions.OV, Permission.VIEW)) return 0

    try {
      return await this.officialVisitsService.countVisitsForReview(user.activeCaseLoadId, user)
    } catch (error) {
      logger.error(error, 'Failed to get the count of visits needing review')
      return 0
    }
  }
}
