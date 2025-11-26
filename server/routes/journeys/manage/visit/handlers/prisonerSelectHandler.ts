import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import PersonalRelationshipsService from '../../../../../services/personalRelationshipsService'
import { schema } from './prisonerSearchSchema'
import { PagedModelPrisonerRestrictionDetails } from '../../../../../@types/personalRelationshipsApi/types'
import logger from '../../../../../../logger'

export default class PrisonerSelectHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SELECT_PAGE

  public BODY = schema

  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly personalRelationshipsService: PersonalRelationshipsService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const prisonerNumber = req.query.prisonerNumber as string
    const searchPage = req.query.page as string
    const { user } = res.locals
    const prisoner = await this.prisonerService.getPrisonerByPrisonerNumber(prisonerNumber, user)

    const restrictionsPagedModel: PagedModelPrisonerRestrictionDetails =
      await this.personalRelationshipsService.getPrisonerRestrictions(prisonerNumber, 0, 10, user, true, false)
    const restrictionsCount = restrictionsPagedModel?.content?.length ?? 0
    const restrictions = restrictionsPagedModel?.content
    const alertsCount = prisoner?.alerts?.length ?? 0
    // Populate what we can in the official visit journey - the prison and prisoner details
    req.session.journey.officialVisit = {
      ...req.session.journey.officialVisit,
      searchPage,
      prisonCode: prisoner.prisonId,
      prisonName: prisoner.prisonName,
      prisoner: {
        firstName: prisoner.firstName,
        lastName: prisoner.lastName,
        dateOfBirth: prisoner.dateOfBirth,
        prisonerNumber: prisoner.prisonerNumber,
        cellLocation: prisoner.cellLocation,
        pncNumber: prisoner.pncNumber,
        croNumber: prisoner.croNumber,
        prisonCode: prisoner.prisonId,
        prisonName: prisoner.prisonName,
        restrictions,
        alertsCount,
        restrictionsCount,
      },
    }

    logger.info(`Session journey officialVisit : ${JSON.stringify(req.session.journey.officialVisit, null, 2)}`)

    res.redirect('visit-type')
  }
}
