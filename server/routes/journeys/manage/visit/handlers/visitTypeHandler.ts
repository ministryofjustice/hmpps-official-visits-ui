import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { refDataRadiosMapper } from '../../../../../utils/utils'

export default class VisitTypeHandler implements PageHandler {
  public PAGE_NAME = Page.VISIT_TYPE_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const visitTypes = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE_CODE')
    res.render('pages/manage/visitType', {
      backUrl: `results?page=${req.session.journey.officialVisit.searchPage || '0'}`,
      visitTypeCode: req.session.journey.officialVisit.visitTypeCode,
      items: visitTypes.map(refDataRadiosMapper),
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    req.session.journey.officialVisit.visitTypeCode = req.body.visitType
    return res.redirect(`time-slot`)
  }
}
