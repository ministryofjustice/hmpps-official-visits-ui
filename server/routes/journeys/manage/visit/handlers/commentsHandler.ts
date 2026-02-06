import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema } from './commentsSchema'

export default class CommentsHandler implements PageHandler {
  public PAGE_NAME = Page.COMMENTS_PAGE

  constructor() {}

  public GET = async (req: Request, res: Response) => {
    res.render('pages/manage/comments', {
      backUrl: req.session.journey.officialVisit.visitType === 'IN_PERSON' ? `equipment` : `assistance-required`,
      prisoner: req.session.journey.officialVisit.prisoner,
      staffNotes: res.locals['formResponses']?.staffNotes || req.session.journey.officialVisit.staffNotes,
      prisonerNotes: res.locals['formResponses']?.prisonerNotes || req.session.journey.officialVisit.prisonerNotes,
    })
  }

  public BODY = schema

  public POST = async (req: Request, res: Response) => {
    req.session.journey.officialVisit.prisonerNotes = req.body.prisonerNotes
    req.session.journey.officialVisit.staffNotes = req.body.staffNotes
    req.session.journey.officialVisit.commentsPageCompleted = true
    return res.redirect(`check-your-answers`)
  }
}
