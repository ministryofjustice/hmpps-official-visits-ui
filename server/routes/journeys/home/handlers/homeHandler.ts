import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'

export default class HomeHandler implements PageHandler {
  public PAGE_NAME = Page.HOME_PAGE

  GET = async (req: Request, res: Response) => {
    res.locals.breadcrumbs.popLastItem()

    return res.render('pages/home/home', {
      showBreadcrumbs: true,
    })
  }
}
