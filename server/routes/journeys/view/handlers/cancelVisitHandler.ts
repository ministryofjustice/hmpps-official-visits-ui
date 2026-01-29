import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { schema } from './cancelVisitHandlerSchema'
import { CompleteVisitRequest, VisitCompletionType } from '../../../../@types/officialVisitsApi/types'

export default class CancelOfficialVisitHandler implements PageHandler {
  public PAGE_NAME = Page.CANCEL_OFFICIAL_VISIT_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  GET = async (req: Request, res: Response) => {
    const { ovId } = req.params
    const b64BackTo = req.query.backTo as string

    const completionCodes = await this.officialVisitsService.getReferenceData(res, 'VIS_COMPLETION')

    return res.render('pages/view/cancel', {
      completionCodes: completionCodes.filter(o => o.code.endsWith('_CANCELLED')),
      back: `/view/visit/${ovId}${b64BackTo ? `?backTo=${b64BackTo}` : ''}`,
    })
  }

  BODY = schema

  POST = async (req: Request, res: Response) => {
    const b64BackTo = req.query.backTo as string
    const prisonCode = req.session.activeCaseLoadId
    const { ovId } = req.params

    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(ovId), res.locals.user)

    const body: CompleteVisitRequest = {
      completionReason: req.body.reason as VisitCompletionType,
      prisonerAttendance: 'ABSENT',
      visitorAttendance: visit.officialVisitors.map(o => ({
        officialVisitorId: o.officialVisitorId,
        visitorAttendance: 'ABSENT',
      })),
      prisonerSearchType: 'PAT',
    }

    await this.officialVisitsService.completeVisit(prisonCode, ovId, body, res.locals.user)
    req.flash('updateVerb', 'cancelled')
    return res.redirect(`/view/visit/${req.params.ovId}${b64BackTo ? `?backTo=${b64BackTo}` : ''}`)
  }
}
