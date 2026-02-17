import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import PrisonerService from '../../../../../services/prisonerService'
import PersonalRelationshipsService from '../../../../../services/personalRelationshipsService'
import { schema } from './prisonerSearchSchema'
import logger from '../../../../../../logger'
import { savePrisonerSelection } from '../createJourneyState'
import TelemetryService from '../../../../../services/telemetryService'

export default class PrisonerSelectHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SELECT_PAGE

  public BODY = schema

  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly personalRelationshipsService: PersonalRelationshipsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const prisonerNumber = req.query.prisonerNumber as string
    const searchPage = req.query.page as string
    const { user } = res.locals
    const now = new Date()

    const [restrictions, prisoner] = await Promise.all([
      this.personalRelationshipsService.getPrisonerRestrictions(prisonerNumber, 0, 10, user, true, false),
      this.prisonerService.getPrisonerByPrisonerNumber(prisonerNumber, user),
    ])
    const activeRestrictions =
      restrictions?.content?.filter(
        restriction => !restriction.expiryDate || new Date(restriction.expiryDate) >= now,
      ) || []
    const { officialVisit } = req.session.journey
    officialVisit.searchPage = searchPage
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
      restrictions: activeRestrictions,
      alertsCount: prisoner?.alerts?.filter(alert => alert.active)?.length ?? 0,
      restrictionsCount: activeRestrictions?.length ?? 0,
    })
    logger.info(`Session journey officialVisit : ${JSON.stringify(officialVisit, null, 2)}`)
    this.telemetryService.trackEvent('OFFICIAL_VISIT_SELECT_PRISONER', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    res.redirect('visit-type')
  }
}
