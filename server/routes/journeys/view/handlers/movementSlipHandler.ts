import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import TelemetryService from '../../../../services/telemetryService'

export default class OfficialVisitMovementSlipHandler implements PageHandler {
  public PAGE_NAME = Page.MOVEMENT_SLIP

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  GET = async (req: Request, res: Response) => {
    const { ovId } = req.params
    const { user } = res.locals

    const prisonCode = req.session.activeCaseLoadId
    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(ovId), user)
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_MOVEMENT_SLIP', user, {
      officialVisitId: visit.officialVisitId,
      prisonCode: visit.prisonCode,
      visitTypeCode: visit.visitTypeCode,
    })
    return res.render('pages/view/movement-slip', { visit, now: new Date() })
  }
}
