import { NextFunction, Request, Response } from 'express'
import { ZodType } from 'zod'
import { $ZodTypeInternals } from 'zod/v4/core'
import { isFuture } from 'date-fns'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import { schema } from './selectOfficialVisitorsSchema'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'
import { cyaGuard, recallContacts, saveVisitors } from '../createJourneyState'
import { socialVisitorsPageEnabled } from '../../../../../utils/utils'
import { getBackLink } from './utils'
import { HmppsUser } from '../../../../../interfaces/hmppsUser'
import { SchemaFactory } from '../../../../../middleware/validationMiddleware'

export default class SelectOfficialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_OFFICIAL_VISITORS_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    useSchema: boolean = true,
  ) {
    if (useSchema) {
      this.BODY = schema
    }
  }

  BODY: ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>> | SchemaFactory | undefined = undefined

  private getSelectableContacts = async (
    prisonerNumber: string,
    user: HmppsUser,
    contactsOnVisit: JourneyVisitor[],
    mode: 'amend' | 'create' = 'create',
  ) => {
    const allContacts = await this.officialVisitsService.getAllOfficialContacts(prisonerNumber, user, undefined, true)
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
          socialVisitor: false,
        },
      }))
      .filter(c => mode === 'amend' || c.isApprovedVisitor)
  }

  public GET = async (req: Request, res: Response, _next?: NextFunction) => {
    // TODO: Assume a middleware caseload access check earlier (user v. prisoner's location)
    const { prisonerNumber } = req.session.journey.officialVisit.prisoner

    const journeyVisitors = req.session.journey.officialVisit.officialVisitors || []
    const selectableContacts = await this.getSelectableContacts(
      prisonerNumber,
      res.locals.user,
      journeyVisitors,
      res.locals.mode,
    )

    // Get the approved official contacts who are already selected for this visit from session data
    const selectedContacts =
      res.locals.formResponses?.selected ||
      journeyVisitors?.map(v => `${v.contactId}-${v.relationshipToPrisonerCode}`) ||
      []

    const rawErrors = req.flash('alertErrors')[0]
    const errors = rawErrors ? JSON.parse(rawErrors) : {}

    const contacts = recallContacts(req.session.journey, 'O', selectableContacts)

    const hasIssueVisitors = contacts.some(v => Object.values(v.issues).some(o => o))
    const hasNoRelationshipVisitors = contacts.some(v => v.issues.noRelationship)
    const hasNotApprovedVisitors = contacts.some(v => v.issues.notApproved)
    const hasSocialVisitors = contacts.some(v => v.issues.socialVisitor)

    // Show the list and prefill the selected checkboxes for official visitors
    const previousDate = req.session.journey.officialVisit?.selectedTimeSlot?.visitDate
    const previousTime = req.session.journey.officialVisit?.selectedTimeSlot?.startTime
    res.render('pages/manage/selectOfficialVisitors', {
      contacts: recallContacts(req.session.journey, 'O', selectableContacts),
      selectedContacts,
      backUrl: getBackLink(req, res, `time-slot${previousDate ? `?date=${previousDate}` : ''}`),
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
    const selected: string[] = Array.isArray(req.body.selected) ? req.body.selected : []

    if (!selected.length) {
      return res.alertValidationError({ empty: true })
    }

    const journeyVisitors = req.session.journey.officialVisit.officialVisitors || []
    const selectableContacts = await this.getSelectableContacts(
      prisonerNumber,
      res.locals.user,
      journeyVisitors,
      res.locals.mode,
    )
    const officialContacts = recallContacts(req.session.journey, 'O', selectableContacts)

    const selectedContacts = selected.map((o: string) => {
      const [contactId, relationshipToPrisonerCode] = o.split('-')
      return officialContacts?.find(
        c => c.contactId === Number(contactId) && c.relationshipToPrisonerCode === relationshipToPrisonerCode,
      )
    })

    if (selectedContacts.some(c => c === undefined || c.issues.noRelationship)) {
      return res.alertValidationError({ noRelationship: true })
    }

    // Update the session journey with selected approved official contacts
    saveVisitors(req.session.journey, 'O', selectedContacts)

    const errors = await cyaGuard(req, res, this.officialVisitsService)

    if (Object.keys(errors).length > 0) {
      return res.alertValidationError(errors)
    }

    return res.redirect(socialVisitorsPageEnabled(req) ? `select-social-visitors` : `assistance-required`)
  }
}
