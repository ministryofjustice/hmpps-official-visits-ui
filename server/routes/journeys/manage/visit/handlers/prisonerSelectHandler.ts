import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import ContactsService from '../../../../../services/personalRelationshipsService'
import { schema } from './prisonerSearchSchema'
import {
  PagedModelPrisonerRestrictionDetails,
  PrisonerRestrictionDetails,
} from '../../../../../@types/personalRelationshipsApi/types'
import logger from '../../../../../../logger'

export default class PrisonerSelectHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SELECT_PAGE

  public BODY = schema

  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly contactsService: ContactsService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const prisonerNumber = req.query.prisonerNumber as string
    const searchPage = req.query.page as string
    const { user } = res.locals
    const prisoner = await this.prisonerService.getPrisonerByPrisonerNumber(prisonerNumber, user)

    let restrictionsCount = 0
    let alertsCount = 0
    let restrictions: PrisonerRestrictionDetails[] = []
    try {
      const restrictionsPagedModel: PagedModelPrisonerRestrictionDetails =
        await this.contactsService.getPrisonerRestrictions(prisonerNumber, 0, 10, user, false, false)
      restrictionsCount = restrictionsPagedModel?.content?.length ?? 0
      restrictions = restrictionsPagedModel?.content
      logger.info(` restrictions for prisoner: ${restrictionsPagedModel}`)
    } catch (err) {
      // do nothing if restrictions fetch fails - we can still show prisoner details
      logger.error(err, `Failed to populate alerts and restrictions for prisoner: ${req.query.prisonerNumber}`)
    }
    alertsCount = prisoner?.alerts?.length ?? 0
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
