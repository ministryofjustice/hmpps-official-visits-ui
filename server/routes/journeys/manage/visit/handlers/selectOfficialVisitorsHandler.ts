import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema, SchemaType } from './selectOfficialVisitorsSchema'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'
import { recallContacts, saveVisitors } from '../createJourneyState'
import { socialVisitorsPageEnabled } from '../../../../../utils/utils'
import { getBackLink } from './utils'
import { HmppsUser } from '../../../../../interfaces/hmppsUser'

export default class SelectOfficialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_OFFICIAL_VISITORS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  BODY = schema

  private getSelectableContacts = async (
    prisonerNumber: string,
    user: HmppsUser,
    contactsOnVisit: JourneyVisitor[],
  ) => {
    const allContacts = await this.officialVisitsService.getAllOfficialContacts(prisonerNumber, user, undefined, true)

    return allContacts.filter(
      o =>
        o.isApprovedVisitor ||
        contactsOnVisit?.some(
          v => v.contactId === o.contactId && v.relationshipToPrisonerCode === o.relationshipToPrisonerCode,
        ),
    )
  }

  public GET = async (req: Request, res: Response) => {
    // TODO: Assume a middleware caseload access check earlier (user v. prisoner's location)
    const { prisonerNumber } = req.session.journey.officialVisit.prisoner

    const journeyVisitors = req.session.journey.officialVisit.officialVisitors || []
    const selectableContacts = await this.getSelectableContacts(prisonerNumber, res.locals.user, journeyVisitors)

    // Get the approved official contacts who are already selected for this visit from session data
    const selectedContacts =
      res.locals.formResponses?.selected ||
      journeyVisitors?.map(v => `${v.contactId}-${v.relationshipToPrisonerCode}`) ||
      []

    // Show the list and prefill the selected checkboxes for official visitors
    res.render('pages/manage/selectOfficialVisitors', {
      contacts: recallContacts(req.session.journey, 'O', selectableContacts),
      selectedContacts,
      backUrl: getBackLink(req, res, `time-slot`),
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request<unknown, SchemaType>, res: Response) => {
    // Use the prison and prisoner details from the session
    const { prisonerNumber } = req.session.journey.officialVisit.prisoner
    const selected: string[] = Array.isArray(req.body.selected) ? req.body.selected : []

    const journeyVisitors = req.session.journey.officialVisit.officialVisitors || []
    const selectableContacts = await this.getSelectableContacts(prisonerNumber, res.locals.user, journeyVisitors)
    const officialContacts = recallContacts(req.session.journey, 'O', selectableContacts)

    // TODO: Does this number of visitors exceed the capacity limits of the time slot selected? Need to check against the time slot selected in the session

    // Update the session journey with selected approved official contacts
    saveVisitors(
      req.session.journey,
      'O',
      selected
        .map((o: string) => {
          const [contactId, relationshipToPrisonerCode] = o.split('-')
          return officialContacts?.find(
            c => c.contactId === Number(contactId) && c.relationshipToPrisonerCode === relationshipToPrisonerCode,
          )
        })
        .filter((o: JourneyVisitor) => o),
    )
    return res.redirect(socialVisitorsPageEnabled(req as Request) ? `select-social-visitors` : `assistance-required`)
  }
}
