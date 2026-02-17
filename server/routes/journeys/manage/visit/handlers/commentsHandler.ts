import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema } from './commentsSchema'
import TelemetryService from '../../../../../services/telemetryService'

export default class CommentsHandler implements PageHandler {
  public PAGE_NAME = Page.COMMENTS_PAGE

  constructor(private readonly telemetryService: TelemetryService) {}

  public GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const { officialVisit } = req.session.journey
    this.telemetryService.trackEvent('OFFICIAL_VISIT_COMMENTS_VIEWED', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    res.render('pages/manage/comments', {
      backUrl: officialVisit.visitType === 'IN_PERSON' ? `equipment` : `assistance-required`,
      prisoner: officialVisit.prisoner,
      staffNotes: res.locals['formResponses']?.staffNotes || officialVisit.staffNotes,
      prisonerNotes: res.locals['formResponses']?.prisonerNotes || officialVisit.prisonerNotes,
    })
  }

  public BODY = schema

  public POST = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    officialVisit.prisonerNotes = req.body.prisonerNotes
    officialVisit.staffNotes = req.body.staffNotes
    officialVisit.commentsPageCompleted = true
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_COMMENTS_UPDATED', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    return res.redirect(`check-your-answers`)
  }
}
