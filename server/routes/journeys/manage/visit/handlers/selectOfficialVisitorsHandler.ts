import { Request, Response } from 'express'
import { isArray } from 'lodash'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'

export default class SelectOfficialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_OFFICIAL_VISITORS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    // TODO: Assume a middleware caseload access check earlier (user v. prisoner's location)
    const { prisonCode, prisonerNumber } = req.session.journey.officialVisit.prisoner

    // Get the prisoner restrictions and a list of approved, official contacts
    const [restrictions, approvedOfficialContacts] = await Promise.all([
      this.officialVisitsService.getActiveRestrictions(res, prisonCode, prisonerNumber),
      this.officialVisitsService.getApprovedOfficialContacts(prisonCode, prisonerNumber, res.locals.user),
    ])

    // Get the approved official contacts who are already selected for this visit from session data
    const selectedContacts =
      res.locals.formResponses?.selected ||
      req.session.journey.officialVisit.officialVisitors?.map(v => v.prisonerContactId) ||
      []

    // Record the prisoner restrictions into the session journey
    req.session.journey.officialVisit.prisoner.restrictions = restrictions

    // TODO: Show the prisoner's restrictions in the view in a table above the contacts list

    // Show the list and prefill the selected checkboxes for official visitors
    res.render('pages/manage/selectOfficialVisitors', {
      restrictions,
      contacts: approvedOfficialContacts,
      selectedContacts,
      backUrl: `time-slot`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    // Use the prison and prisoner details from the session
    const { prisonCode, prisonerNumber } = req.session.journey.officialVisit.prisoner
    const selected = isArray(req.body.selected) ? req.body.selected : [req.body.selected].filter(o => o !== null)

    // Get the approved official visitors
    const allApprovedOfficialContacts = await this.officialVisitsService.getApprovedOfficialContacts(
      prisonCode,
      prisonerNumber,
      res.locals.user,
    )

    // TODO: Validation middleware should detect an empty list for selected official contacts - at least 1 must be selected

    // TODO: Does this number of visitors exceed the capacity limits of the time slot selected? Validation here.

    // TODO: How to prompt for the lead visitor? Needs an extra input or flag?

    // Update the session journey with selected approved official contacts
    req.session.journey.officialVisit.officialVisitors = (selected || []).map((o: number) => {
      const contact = allApprovedOfficialContacts?.find(c => c.prisonerContactId === Number(o))
      return { ...contact } as JourneyVisitor
    })

    return res.redirect(`select-social-visitors`)
  }
}
