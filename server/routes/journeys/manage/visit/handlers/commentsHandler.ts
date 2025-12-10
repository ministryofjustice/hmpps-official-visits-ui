import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { schema } from './commentsSchema'

export default class CommentsHandler implements PageHandler {
  public PAGE_NAME = Page.COMMENTS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    res.render('pages/manage/comments', {
      backUrl: req.session.journey.officialVisit.visitType === 'IN_PERSON' ? `equipment` : `assistance-required`,
      prisoner: req.session.journey.officialVisit.prisoner,
      comments: res.locals['formResponses']?.comments || req.session.journey.officialVisit.prisonerNotes,
    })
  }

  public BODY = schema

  public POST = async (req: Request, res: Response) => {
    req.session.journey.officialVisit.prisonerNotes = req.body.comments
    req.session.journey.officialVisit.commentsPageCompleted = true
    return res.redirect(`check-your-answers`)
  }
}
