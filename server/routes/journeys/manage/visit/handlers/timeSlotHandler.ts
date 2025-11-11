import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import logger from '../../../../../../logger'

export default class TimeSlotHandler implements PageHandler {
  public PAGE_NAME = Page.CHOOSE_TIME_SLOT_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    res.render('pages/manage/chooseTimeSlot', {
      prisoner: req.session.journey.officialVisit.prisoner,
      showBreadcrumbs: true,
    })
  }
}
