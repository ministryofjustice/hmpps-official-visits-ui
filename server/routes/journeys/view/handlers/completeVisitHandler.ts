import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { schemaFactory } from './completeVisitHandlerSchema'
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
    const b64BackTo = req.query.backTo as string

    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(ovId), user)
    const completionCodes = await this.officialVisitsService.getReferenceData(res, 'VIS_COMPLETION')
    const searchTypes = await this.officialVisitsService.getReferenceData(res, 'SEARCH_LEVEL')
    const prisoner = visit.prisonerVisited

    return res.render('pages/view/complete', {
      completionCodes: completionCodes.filter(o => !o.code.endsWith('_CANCELLED')),
      prisoner,
      visit,
      contacts: visit.officialVisitors,
      searchTypes,
      back: `/view/visit/${ovId}?backTo=${b64BackTo}`,
    })
  }

  BODY: SchemaFactory

  POST = async (req: Request, res: Response) => {
    const { ovId } = req.params
    const b64BackTo = req.query.backTo as string
    // TODO: Send this off to API
    req.flash('updateVerb', 'completed')
    return res.redirect(`/view/visit/${ovId}?backTo=${b64BackTo}`)
  }
}
