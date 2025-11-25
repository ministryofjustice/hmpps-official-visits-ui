import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'

export default class SelectSocialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_SOCIAL_VISITORS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    // TODO: Assume a middleware caseload access check earlier (user v. prisoner's location)
    const { prisonCode, prisonerNumber } = req.session.journey.officialVisit.prisoner

    // TODO: Do we need to get the prisoner restrictions here? They should be added to the prisoner session object when selected.

    // Get the prisoner's list of approved, social contacts
    const [approvedSocialContacts] = await Promise.all([
      this.officialVisitsService.getApprovedSocialContacts(prisonCode, prisonerNumber, res.locals.user),
    ])

    // Record the approved social contacts who are already selected for this visit in session data
    const selectedContacts =
      res.locals.formResponses?.selected ||
      req.session.journey.officialVisit.socialVisitors?.map(v => v.prisonerContactId) ||
      []
    // Show the list and prefill the checkboxes for the selected social visitors
    res.render('pages/manage/selectSocialVisitors', {
      contacts: approvedSocialContacts,
      selectedContacts,
      backUrl: `select-official-visitors`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    // Use the prison and prisoner details from the session
    const { prisonCode, prisonerNumber } = req.session.journey.officialVisit.prisoner
    const selected = Array.isArray(req.body.selected) ? req.body.selected : []

    const allApprovedSocialContacts = await this.officialVisitsService.getApprovedSocialContacts(
      prisonCode,
      prisonerNumber,
      res.locals.user,
    )

    // TODO: Does this number of visitors exceed the capacity limits of the time slot selected? Validation here.

    // Update the session with the selected approved social visitors, or an empty list if none
    req.session.journey.officialVisit.socialVisitors =
      selected.length > 0
        ? selected.map((o: number) => {
            const contact = allApprovedSocialContacts.find(c => c.prisonerContactId === Number(o))
            return { ...contact, leadVisitor: false } as JourneyVisitor
          })
        : []

    return res.redirect(`assistance-required`)
  }
}
