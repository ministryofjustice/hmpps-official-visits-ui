import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema, SchemaType } from './selectOfficialVisitorsSchema'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'

export default class SelectOfficialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_OFFICIAL_VISITORS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  public GET = async (req: Request, res: Response) => {
    // TODO: Assume a middleware caseload access check earlier (user v. prisoner's location)
    const { prisonCode, prisonerNumber } = req.session.journey.officialVisit.prisoner

    // Get the prisoner's list of approved, official contacts
    const [approvedOfficialContacts] = await Promise.all([
      this.officialVisitsService.getApprovedOfficialContacts(prisonCode, prisonerNumber, res.locals.user),
    ])

    // Get the approved official contacts who are already selected for this visit from session data
    const selectedContacts =
      res.locals.formResponses?.selected ||
      req.session.journey.officialVisit.officialVisitors?.map(v => v.prisonerContactId) ||
      []

    // Show the list and prefill the selected checkboxes for official visitors
    res.render('pages/manage/selectOfficialVisitors', {
      contacts: approvedOfficialContacts,
      selectedContacts,
      backUrl: `time-slot`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request<unknown, SchemaType>, res: Response) => {
    // Use the prison and prisoner details from the session
    const { prisonCode, prisonerNumber } = req.session.journey.officialVisit.prisoner
    const selected: string[] = Array.isArray(req.body.selected) ? req.body.selected : []

    const allApprovedOfficialContacts = await this.officialVisitsService.getApprovedOfficialContacts(
      prisonCode,
      prisonerNumber,
      res.locals.user,
    )

    // TODO: Does this number of visitors exceed the capacity limits of the time slot selected? Need to check against the time slot selected in the session

    // Update the session journey with selected approved official contacts
    req.session.journey.officialVisit.officialVisitors =
      selected.length > 0
        ? selected.map((o: string) => {
            const contact = allApprovedOfficialContacts?.find(c => c.prisonerContactId === Number(o))
            return { ...contact, leadVisitor: false } as JourneyVisitor
          })
        : []

    return res.redirect(`select-social-visitors`)
  }
}
