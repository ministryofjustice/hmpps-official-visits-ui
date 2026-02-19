import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'

export default class OfficialVisitMovementSlipHandler implements PageHandler {
  public PAGE_NAME = Page.MOVEMENT_SLIP

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  GET = async (req: Request, res: Response) => {
    const { ovId } = req.params
    const { user } = res.locals

    const prisonCode = req.session.activeCaseLoadId
    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(ovId), user)
    return res.render('pages/view/movement-slip', { visit, now: new Date() })
  }
}
