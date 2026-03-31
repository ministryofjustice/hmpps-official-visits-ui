import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'
import { hasPrisonerOverlap, recallContacts, saveVisitors } from '../createJourneyState'
import { getBackLink } from './utils'
import { HmppsUser } from '../../../../../interfaces/hmppsUser'

export default class SelectSocialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_SOCIAL_VISITORS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  private getSelectableContacts = async (
    prisonerNumber: string,
    user: HmppsUser,
    contactsOnVisit: JourneyVisitor[],
  ) => {
    const allContacts = await this.officialVisitsService.getAllSocialContacts(prisonerNumber, user, undefined, true)

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
    const journeyVisitors = req.session.journey.officialVisit.socialVisitors || []
    const selectableContacts = await this.getSelectableContacts(prisonerNumber, res.locals.user, journeyVisitors)

    // Record the approved social contacts who are already selected for this visit in session data
    const selectedContacts =
      res.locals.formResponses?.selected ||
      journeyVisitors?.map(v => `${v.contactId}-${v.relationshipToPrisonerCode}`) ||
      []

    // Show the list and prefill the checkboxes for the selected social visitors
    res.render('pages/manage/selectSocialVisitors', {
      contacts: recallContacts(req.session.journey, 'S', selectableContacts),
      selectedContacts,
      backUrl: getBackLink(req, res, `select-official-visitors`),
      prisoner: req.session.journey.officialVisit.prisoner,
      hasVisitorOverlap: req.flash('hasVisitorOverlap')[0] === 'true',
    })
  }

  public POST = async (req: Request, res: Response) => {
    // Use the prison and prisoner details from the session
    const { prisonerNumber } = req.session.journey.officialVisit.prisoner
    const selected = Array.isArray(req.body.selected) ? req.body.selected : []

    const journeyVisitors = req.session.journey.officialVisit.socialVisitors || []
    const selectableContacts = await this.getSelectableContacts(prisonerNumber, res.locals.user, journeyVisitors)
    const socialContacts = recallContacts(req.session.journey, 'S', selectableContacts)

    // Check for visitor overlaps if a time slot is selected
    const { officialVisit } = req.session.journey

    if (officialVisit.selectedTimeSlot) {
      const allVisitors = [...(officialVisit.officialVisitors || []), ...(officialVisit.socialVisitors || [])]
      const contactIds = allVisitors.map(v => v.contactId)

      const overlapResult = await this.officialVisitsService.checkForOverlappingVisits(
        officialVisit.prisoner.prisonCode,
        officialVisit.prisoner.prisonerNumber,
        officialVisit.selectedTimeSlot.visitDate,
        officialVisit.selectedTimeSlot.startTime,
        officialVisit.selectedTimeSlot.endTime,
        contactIds,
        officialVisit.officialVisitId || 0,
        res.locals.user,
      )

      if (hasPrisonerOverlap(overlapResult)) {
        req.flash('hasVisitorOverlap', 'true')
        return res.redirect(req.get('Referrer') || req.originalUrl)
      }
    }

    // Update the session with the selected approved social visitors, or an empty list if none
    saveVisitors(
      req.session.journey,
      'S',
      selected
        .map((o: string) => {
          const [contactId, relationshipToPrisonerCode] = o.split('-')
          return socialContacts?.find(
            c => c.contactId === Number(contactId) && c.relationshipToPrisonerCode === relationshipToPrisonerCode,
          )
        })
        .filter((o: JourneyVisitor) => o),
    )

    req.session.journey.officialVisit.socialVisitorsPageCompleted = true
    return res.redirect(`assistance-required`)
  }
}
