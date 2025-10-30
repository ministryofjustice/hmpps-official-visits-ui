import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import PrisonerService from '../../../../../services/prisonerService'

export default class CheckYourAnswersHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_YOUR_ANSWERS_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    const { prisoner } = officialVisit
    return res.render('pages/manageVisits/checkYourAnswers', { officialVisit, prisoner })
  }

  public POST = async (req: Request, res: Response) => {
    const { user } = res.locals
    const { mode } = req.routeContext

    if (mode === 'create') {
      const id = await this.officialVisitsService.createVisit(req.session.journey.officialVisit, user)
      return res.redirect(`confirmation/${id}`)
    }

    if (mode === 'amend') {
      await this.officialVisitsService.amendVisit(req.session.journey.officialVisit, user)
    }

    return res.redirect(`confirmation`)
  }
}
