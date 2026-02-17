import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { refDataRadiosMapper } from '../../../../../utils/utils'
import { schemaFactory } from './visitTypeSchema'
import { SchemaFactory } from '../../../../../middleware/validationMiddleware'
import { saveVisitType } from '../createJourneyState'
import TelemetryService from '../../../../../services/telemetryService'

export default class VisitTypeHandler implements PageHandler {
  public PAGE_NAME = Page.VISIT_TYPE_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {
    this.BODY = schemaFactory(this.officialVisitsService)
  }

  BODY: SchemaFactory

  public GET = async (req: Request, res: Response) => {
    const visitTypes = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE')
    const { user } = res.locals
    const { officialVisit } = req.session.journey
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_VISIT_TYPE', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
      visitType: officialVisit.visitType,
    })
    res.render('pages/manage/visitType', {
      backUrl: `results?page=${officialVisit.searchPage || '0'}`,
      visitType: officialVisit.visitType,
      items: visitTypes.map(refDataRadiosMapper),
      prisoner: officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const visitTypes = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE')
    saveVisitType(
      req.session.journey,
      visitTypes.find(t => t.code === req.body.visitType),
    )
    const { user } = res.locals
    const { officialVisit } = req.session.journey
    this.telemetryService.trackEvent('OFFICIAL_VISIT_UPDATE_VISIT_TYPE', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
      visitType: officialVisit.visitType,
    })
    return res.redirect(`time-slot`)
  }
}
