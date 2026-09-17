import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { hasPerm } from '../../../../../middleware/requirePermissions'
import { Permission } from '../../../../../interfaces/hmppsUser'

export default class NoVideoCapacityHandler implements PageHandler {
  public PAGE_NAME = Page.NO_VIDEO_CAPACITY_PAGE

  public GET = async (req: Request, res: Response) => {
    res.render('pages/manage/noVideoCapacity', {
      backUrl: 'visit-type',
      prisoner: req.session.journey.officialVisit.prisoner,
      isAdmin: hasPerm(res.locals.user.permissions.OV, Permission.ADMIN),
    })
  }
}
