import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'
import { recallContacts, saveVisitors } from '../createJourneyState'
import TelemetryService from '../../../../../services/telemetryService'

export default class SelectSocialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_SOCIAL_VISITORS_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    // TODO: Assume a middleware caseload access check earlier (user v. prisoner's location)
    const { officialVisit } = req.session.journey
    const { prisonCode, prisonerNumber } = officialVisit.prisoner

    // Get the prisoner's list of approved, social contacts
    const [approvedSocialContacts] = await Promise.all([
      this.officialVisitsService.getApprovedSocialContacts(prisonCode, prisonerNumber, res.locals.user),
    ])

    // Record the approved social contacts who are already selected for this visit in session data
    const selectedContacts =
      res.locals.formResponses?.selected || officialVisit.socialVisitors?.map(v => v.prisonerContactId) || []
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_VIEW_SOCIAL_VISITORS', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    // Show the list and prefill the checkboxes for the selected social visitors
    res.render('pages/manage/selectSocialVisitors', {
      contacts: recallContacts(req.session.journey, 'S', approvedSocialContacts),
      selectedContacts,
      backUrl: `select-official-visitors`,
      prisoner: officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    // Use the prison and prisoner details from the session
    const { officialVisit } = req.session.journey
    const { prisonCode, prisonerNumber } = officialVisit.prisoner
    const selected = Array.isArray(req.body.selected) ? req.body.selected : []

    const allApprovedSocialContacts = recallContacts(
      req.session.journey,
      'S',
      await this.officialVisitsService.getApprovedSocialContacts(prisonCode, prisonerNumber, res.locals.user),
    )

    // TODO: Does this number of visitors exceed the capacity limits of the time slot selected? Validation here.

    // Update the session with the selected approved social visitors, or an empty list if none
    saveVisitors(
      req.session.journey,
      'S',
      selected
        .map((o: string) => {
          const contact = allApprovedSocialContacts?.find(c => c.prisonerContactId === Number(o))
          return contact ? { ...contact, leadVisitor: false } : undefined
        })
        .filter((o: JourneyVisitor) => o),
    )

    officialVisit.socialVisitorsPageCompleted = true
    const { user } = res.locals
    this.telemetryService.trackEvent('OFFICIAL_VISIT_UPDATE_SOCIAL_VISITORS', user, {
      officialVisitId: officialVisit.officialVisitId,
      prisonCode: officialVisit.prisonCode,
    })
    return res.redirect(`assistance-required`)
  }
}
