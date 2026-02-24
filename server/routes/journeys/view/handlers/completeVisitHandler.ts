import { Request, Response } from 'express'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { schemaFactory, SchemaType } from './completeVisitHandlerSchema'
import { SchemaFactory } from '../../../../middleware/validationMiddleware'
import { CompleteVisitRequest, SearchLevelType, VisitCompletionType } from '../../../../@types/officialVisitsApi/types'
import TelemetryService from '../../../../services/telemetryService'

export default class CompleteOfficialVisitHandler implements PageHandler {
  public PAGE_NAME = Page.COMPLETE_OFFICIAL_VISIT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {
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

    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_COMPLETING_VISIT', user, {
      officialVisitId: visit.officialVisitId,
      prisonCode: visit.prisonCode,
      visitTypeCode: visit.visitTypeCode,
    })
    return res.render('pages/view/complete', {
      completionCodes: completionCodes.filter(o => !o.code.endsWith('_CANCELLED')),
      prisoner,
      visit,
      contacts: visit.officialVisitors,
      searchTypes,
      comments: res.locals.formResponses?.['comments'],
      back: `/view/visit/${ovId}${b64BackTo ? `?backTo=${b64BackTo}` : ''}`,
    })
  }

  BODY: SchemaFactory

  POST = async (req: Request, res: Response) => {
    const b64BackTo = req.query.backTo as string
    const prisonCode = req.session.activeCaseLoadId
    const { ovId } = req.params
    const reqBody = req.body as SchemaType

    const visit = await this.officialVisitsService.getOfficialVisitById(prisonCode, Number(ovId), res.locals.user)

    const body: CompleteVisitRequest = {
      completionReason: req.body.reason as VisitCompletionType,
      prisonerAttendance: req.body.prisoner ? 'ATTENDED' : 'ABSENT',
      visitorAttendance: visit.officialVisitors.map(o => ({
        officialVisitorId: o.officialVisitorId,
        visitorAttendance: reqBody.attendance?.includes(String(o.officialVisitorId)) ? 'ATTENDED' : 'ABSENT',
      })),
      prisonerSearchType: reqBody.searchType as SearchLevelType,
      completionNotes: reqBody.comments,
    }

    await this.officialVisitsService.completeVisit(prisonCode, ovId, body, res.locals.user)
    req.flash('updateVerb', 'completed')
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_COMPLETE_VISIT', user, {
      officialVisitId: ovId,
      prisonCode,
    })
    return res.redirect(`/view/visit/${ovId}${b64BackTo ? `?backTo=${b64BackTo}` : ''}`)
  }
}
