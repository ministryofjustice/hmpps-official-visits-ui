import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { refDataRadiosMapper } from '../../../../../utils/utils'
import { schemaFactory } from './visitTypeSchema'
import { SchemaFactory } from '../../../../../middleware/validationMiddleware'
import { saveVisitType } from '../createJourneyState'
import { VisitType } from '../../../../../@types/officialVisitsApi/types'
import { getBackLink } from './utils'

export default class VisitTypeHandler implements PageHandler {
  public PAGE_NAME = Page.VISIT_TYPE_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {
    this.BODY = schemaFactory(this.officialVisitsService)
  }

  BODY: SchemaFactory

  public GET = async (req: Request, res: Response) => {
    const visitTypes = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE')
    res.render('pages/manage/visitType', {
      backUrl: getBackLink(req, res, `results?page=${req.session.journey.officialVisit.searchPage || '0'}`),
      visitType: req.session.journey.officialVisit.visitType,
      items: visitTypes.map(refDataRadiosMapper),
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const visitTypes = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE')
    const visitType = visitTypes.find(t => t.code === req.body.visitType)

    if (res.locals.mode === 'amend') {
      req.session.journey.officialVisit.visitType = visitType.code as VisitType
      req.session.journey.officialVisit.visitTypeDescription = visitType.description
      return res.redirect(`time-slot`)
    }

    // TOOD: Revisit resetting journey data when changing data on CYA
    saveVisitType(req.session.journey, visitType)
    return res.redirect(`time-slot`)
  }
}
