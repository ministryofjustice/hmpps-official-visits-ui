import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { refDataRadiosMapper } from '../../../../../utils/utils'
import { schemaFactory } from './visitTypeSchema'
import { SchemaFactory } from '../../../../../middleware/validationMiddleware'
import { saveVisitType } from '../createJourneyGuard'

export default class VisitTypeHandler implements PageHandler {
  public PAGE_NAME = Page.VISIT_TYPE_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {
    this.BODY = schemaFactory(this.officialVisitsService)
  }

  BODY: SchemaFactory

  public GET = async (req: Request, res: Response) => {
    const visitTypes = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE')
    res.render('pages/manage/visitType', {
      backUrl: `results?page=${req.session.journey.officialVisit.searchPage || '0'}`,
      visitType: req.session.journey.officialVisit.visitType,
      items: visitTypes.map(refDataRadiosMapper),
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const visitTypes = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE')
    saveVisitType(
      req.session.journey,
      visitTypes.find(t => t.code === req.body.visitType),
    )
    return res.redirect(`time-slot`)
  }
}
