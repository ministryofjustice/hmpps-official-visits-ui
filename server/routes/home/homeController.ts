import { Request, Response } from 'express'

export class HomePageController {
  GET = async (req: Request, res: Response) => {
    res.locals.breadcrumbs.popLastItem()

    return res.render('pages/home/home', {
      showBreadcrumbs: true,
    })
  }
}
