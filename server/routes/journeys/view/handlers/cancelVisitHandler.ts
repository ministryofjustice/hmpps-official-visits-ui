import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { schema } from './cancelVisitHandlerSchema'
import { CancelTypeRequest, VisitCompletionType } from '../../../../@types/officialVisitsApi/types'
import TelemetryService from '../../../../services/telemetryService'

export default class CancelOfficialVisitHandler implements PageHandler {
  public PAGE_NAME = Page.CANCEL_OFFICIAL_VISIT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  GET = async (req: Request, res: Response) => {
    const { ovId } = req.params
    const b64BackTo = req.query.backTo as string

    const completionCodes = await this.officialVisitsService.getReferenceData(res, 'VIS_COMPLETION')
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_BEFORE_CANCEL_VISIT', user, {
      officialVisitId: ovId,
    })
    return res.render('pages/view/cancel', {
      completionCodes: completionCodes.filter(o => o.code.endsWith('_CANCELLED')),
      reason: res.locals.formResponses?.['reason'],
      comments: res.locals.formResponses?.['comments'],
      back: `/view/visit/${ovId}${b64BackTo ? `?backTo=${b64BackTo}` : ''}`,
    })
  }

  BODY = schema

  POST = async (req: Request, res: Response) => {
    const b64BackTo = req.query.backTo as string
    const prisonCode = req.session.activeCaseLoadId
    const { ovId } = req.params

    const body: CancelTypeRequest = {
      cancellationReason: req.body.reason as VisitCompletionType,
      cancellationNotes: req.body.comments,
    }

    await this.officialVisitsService.cancelVisit(prisonCode, ovId, body, res.locals.user)
    req.flash('updateVerb', 'cancelled')
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_CANCEL_VISIT', user, {
      officialVisitId: ovId,
      prisonCode,
      cancellationReason: body.cancellationReason,
    })
    return res.redirect(`/view/visit/${req.params.ovId}${b64BackTo ? `?backTo=${b64BackTo}` : ''}`)
  }
}
