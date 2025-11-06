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
    const { prisonerNumber } = req.params
    const { user } = res.locals
    const prisoner = await this.prisonerService.getPrisonerByPrisonerNumber(prisonerNumber, user)

    // Fully populate the search session data with the prisoner
    req.session.journey.prisonerSearch = {
      ...req.session.journey.prisonerSearch,
      firstName: prisoner.firstName,
      lastName: prisoner.lastName,
      dateOfBirth: prisoner.dateOfBirth,
      cellLocation: prisoner.cellLocation,
      pncNumber: prisoner.pncNumber,
      croNumber: prisoner.croNumber,
    }

    // Populate what we can in the official visit journey - the prison and prisoner details
    req.session.journey.officialVisit = {
      ...req.session.journey.officialVisit,
      prisonCode: prisoner.prisonId,
      prisonName: prisoner.prisonName,
      prisoner: {
        firstName: prisoner.firstName,
        lastName: prisoner.lastName,
        dateOfBirth: prisoner.dateOfBirth,
        prisonerNumber: prisoner.prisonerNumber,
        cellLocation: prisoner.cellLocation,
      },
    }

    logger.info(`Session journey prisonerSearch : ${JSON.stringify(req.session.journey.prisonerSearch, null, 2)}`)
    logger.info(`Session journey officialVisit : ${JSON.stringify(req.session.journey.officialVisit, null, 2)}`)

    res.render('pages/manage/chooseTimeSlot', { prisoner, showBreadcrumbs: true })
  }
}
