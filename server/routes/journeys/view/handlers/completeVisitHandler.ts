import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { schemaFactory } from './completeVisiitHandlerSchema'
import { SchemaFactory } from '../../../../middleware/validationMiddleware'

export default class CompleteOfficialVisitHandler implements PageHandler {
  public PAGE_NAME = Page.COMPLETE_OFFICIAL_VISIT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {
    this.BODY = schemaFactory(this.officialVisitsService)
  }

  GET = async (req: Request, res: Response) => {
    const { ovId } = req.params
    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId

    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(ovId), user)
    const completionCodes = await this.officialVisitsService.getReferenceData(res, 'VIS_COMPLETION')
    const searchType = await this.officialVisitsService.getReferenceData(res, 'SEARCH_LEVEL')

    return res.render('pages/view/complete', {
      completionCodes: completionCodes.filter(o => !o.code.endsWith('_CANCELLED')),
      visit,
      contacts: visit.officialVisitors,
      searchType,
      back: `/view/visit/${ovId}`,
    })
  }

  BODY: SchemaFactory

  POST = async (req: Request, res: Response) => {
    const { ovId } = req.params
    // TODO: Send this off to API
    // Example: {
    //  reason: "NORMAL",
    //  attendance: [
    //   {
    //     id: "7331618",
    //     searchType: "FULL",
    //   },
    // ],
    // }
    req.flash('updateVerb', 'completed')
    return res.redirect(`/view/visit/${ovId}`)
  }
}
