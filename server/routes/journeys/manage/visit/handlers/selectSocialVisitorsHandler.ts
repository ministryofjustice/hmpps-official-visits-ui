import { NextFunction, Request, Response } from 'express'
import { isFuture } from 'date-fns'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'
import { cyaGuard, recallContacts, saveVisitors } from '../createJourneyState'
import { getBackLink } from './utils'
import { HmppsUser } from '../../../../../interfaces/hmppsUser'
import { prisonAllowsSocialVisitors } from '../../../../../utils/utils'

export default class SelectSocialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_SOCIAL_VISITORS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  private getSelectableContacts = async (
    req: Request,
    prisonerNumber: string,
    user: HmppsUser,
    contactsOnVisit: JourneyVisitor[],
    mode: 'amend' | 'create' = 'create',
  ) => {
    const allContacts = await this.officialVisitsService.getAllSocialContacts(prisonerNumber, user, undefined, true)
    const contactKey = (c: { contactId: number; relationshipToPrisonerCode: string }) =>
      `${c.contactId}-${c.relationshipToPrisonerCode}`

    const apiContacts = new Map(allContacts.map(c => [contactKey(c), c]))
    const journeyContacts = contactsOnVisit.filter(c => !apiContacts.has(contactKey(c)))

    return [...allContacts, ...journeyContacts]
      .map(c => ({
        ...c,
        issues: {
          notApproved: apiContacts.has(contactKey(c)) && !c.isApprovedVisitor,
          noRelationship: !apiContacts.has(contactKey(c)),
          socialVisitor: !prisonAllowsSocialVisitors(req),
        },
      }))
      .filter(c => mode === 'amend' || c.isApprovedVisitor)
  }

  public GET = async (req: Request, res: Response, _next?: NextFunction) => {
    // TODO: Assume a middleware caseload access check earlier (user v. prisoner's location)
    const { prisonerNumber } = req.session.journey.officialVisit.prisoner
    const journeyVisitors = req.session.journey.officialVisit.socialVisitors || []
    const selectableContacts = await this.getSelectableContacts(
      req,
      prisonerNumber,
      res.locals.user,
      journeyVisitors,
      res.locals.mode,
    )

    // Record the approved social contacts who are already selected for this visit in session data
    const selectedContacts =
      res.locals.formResponses?.selected ||
      journeyVisitors?.map(v => `${v.contactId}-${v.relationshipToPrisonerCode}`) ||
      []

    const rawErrors = req.flash('alertErrors')[0]
    const errors = rawErrors ? JSON.parse(rawErrors) : {}

    const contacts = recallContacts(req.session.journey, 'S', selectableContacts)
    const hasIssueVisitors = contacts.some(v => Object.values(v.issues).some(o => o))
    const hasNoRelationshipVisitors = contacts.some(v => v.issues.noRelationship)
    const hasNotApprovedVisitors = contacts.some(v => v.issues.notApproved)
    const hasSocialVisitors = contacts.some(v => v.issues.socialVisitor)

    // Show the list and prefill the checkboxes for the selected social visitors
    const previousDate = req.session.journey.officialVisit?.selectedTimeSlot?.visitDate
    const previousTime = req.session.journey.officialVisit?.selectedTimeSlot?.startTime
    res.render('pages/manage/selectSocialVisitors', {
      contacts,
      selectedContacts,
      backUrl: getBackLink(req, res, `select-official-visitors`),
      prisoner: req.session.journey.officialVisit.prisoner,
      hasVisitorOverlap: req.flash('hasVisitorOverlap')[0] === 'true',
      checks: errors,
      visitId: req.session.journey.officialVisit.officialVisitId,
      hasNoRelationshipVisitors,
      hasNotApprovedVisitors,
      hasSocialVisitors,
      hasIssueVisitors,
      shouldShowIssues: isFuture(new Date(`${previousDate} ${previousTime}`)),
    })
  }

  public POST = async (req: Request, res: Response) => {
    // Use the prison and prisoner details from the session
    const { prisonerNumber } = req.session.journey.officialVisit.prisoner
    const selected = Array.isArray(req.body.selected) ? req.body.selected : []
    const journeyVisitors = req.session.journey.officialVisit.socialVisitors || []
    const selectableContacts = await this.getSelectableContacts(
      req,
      prisonerNumber,
      res.locals.user,
      journeyVisitors,
      res.locals.mode,
    )
    const socialContacts = recallContacts(req.session.journey, 'S', selectableContacts)

    const selectedContacts: JourneyVisitor[] = selected.map((o: string) => {
      const [contactId, relationshipToPrisonerCode] = o.split('-')
      return socialContacts?.find(
        c => c.contactId === Number(contactId) && c.relationshipToPrisonerCode === relationshipToPrisonerCode,
      )
    })

    if (selectedContacts.some(c => c === undefined || c.issues.noRelationship)) {
      return res.alertValidationError({ noRelationship: true })
    }

    // Update the session with the selected approved social visitors, or an empty list if none
    saveVisitors(req.session.journey, 'S', selectedContacts)

    const errors = await cyaGuard(req as Request, res, this.officialVisitsService)

    if (Object.keys(errors).length > 0) {
      return res.alertValidationError(errors)
    }

    req.session.journey.officialVisit.socialVisitorsPageCompleted = true
    return res.redirect(`assistance-required`)
  }
}
