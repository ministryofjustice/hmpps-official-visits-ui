import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema, SchemaType } from './selectOfficialVisitorsSchema'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'
import { recallContacts, saveVisitors } from '../createJourneyState'
import { socialVisitorsPageEnabled } from '../../../../../utils/utils'
import TelemetryService from '../../../../../services/telemetryService'

export default class SelectOfficialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_OFFICIAL_VISITORS_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    // TODO: Assume a middleware caseload access check earlier (user v. prisoner's location)
    const { officialVisit } = req.session.journey
    const { prisonCode, prisonerNumber } = officialVisit.prisoner

    // Get the prisoner's list of approved, official contacts
    const approvedOfficialContacts = await this.officialVisitsService.getApprovedOfficialContacts(
      prisonCode,
      prisonerNumber,
      res.locals.user,
    )

    // Get the approved official contacts who are already selected for this visit from session data
    const selectedContacts =
      res.locals.formResponses?.selected || officialVisit.officialVisitors?.map(v => v.prisonerContactId) || []
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_OFFICIAL_VISITORS', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    // Show the list and prefill the selected checkboxes for official visitors
    res.render('pages/manage/selectOfficialVisitors', {
      contacts: recallContacts(req.session.journey, 'O', approvedOfficialContacts),
      selectedContacts,
      backUrl: `time-slot`,
      prisoner: officialVisit.prisoner,
    })
  }

  public POST = async (req: Request<unknown, SchemaType>, res: Response) => {
    // Use the prison and prisoner details from the session
    const { officialVisit } = req.session.journey
    const { prisonCode, prisonerNumber } = officialVisit.prisoner
    const selected: string[] = Array.isArray(req.body.selected) ? req.body.selected : []

    const allApprovedOfficialContacts = recallContacts(
      req.session.journey,
      'O',
      await this.officialVisitsService.getApprovedOfficialContacts(prisonCode, prisonerNumber, res.locals.user),
    )

    // TODO: Does this number of visitors exceed the capacity limits of the time slot selected? Need to check against the time slot selected in the session

    // Update the session journey with selected approved official contacts
    saveVisitors(
      req.session.journey,
      'O',
      selected
        .map((o: string) => {
          const contact = allApprovedOfficialContacts?.find(c => c.prisonerContactId === Number(o))
          return contact ? { ...contact, leadVisitor: false } : undefined
        })
        .filter((o: JourneyVisitor) => o),
    )
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_UPDATE_OFFICIAL_VISITORS', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    return res.redirect(socialVisitorsPageEnabled(req as Request) ? `select-social-visitors` : `assistance-required`)
  }
}
