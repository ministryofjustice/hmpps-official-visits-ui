import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import PersonalRelationshipsService from '../../../../../services/personalRelationshipsService'
import { schema } from './prisonerSearchSchema'
import logger from '../../../../../../logger'
import { savePrisonerSelection } from '../createJourneyState'

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

    const [restrictions, prisoner] = await Promise.all([
      this.personalRelationshipsService.getPrisonerRestrictions(prisonerNumber, 0, 10, user, true, false),
      this.prisonerService.getPrisonerByPrisonerNumber(prisonerNumber, user),
    ])

    req.session.journey.officialVisit.searchPage = searchPage
    savePrisonerSelection(req.session.journey, {
      firstName: prisoner.firstName,
      lastName: prisoner.lastName,
      dateOfBirth: prisoner.dateOfBirth,
      prisonerNumber: prisoner.prisonerNumber,
      cellLocation: prisoner.cellLocation,
      pncNumber: prisoner.pncNumber,
      croNumber: prisoner.croNumber,
      prisonCode: prisoner.prisonId,
      prisonName: prisoner.prisonName,
      restrictions: restrictions?.content || [],
      alertsCount: prisoner?.alerts?.filter(alert => alert.active)?.length ?? 0,
      restrictionsCount: restrictions?.content?.length ?? 0,
    })

    logger.info(`Session journey officialVisit : ${JSON.stringify(req.session.journey.officialVisit, null, 2)}`)

    res.redirect('visit-type')
  }
}
