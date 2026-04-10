import { NextFunction, Request, Response } from 'express'
import { ZodType } from 'zod'
import { $ZodTypeInternals } from 'zod/v4/core'
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
  ) => {
    const allContacts = await this.officialVisitsService.getAllOfficialContacts(prisonerNumber, user, undefined, true)
    contactsOnVisit.forEach(o => {
      if (
        !allContacts.find(
          c => c.contactId === o.contactId && c.relationshipToPrisonerCode === o.relationshipToPrisonerCode,
        )
      ) {
        allContacts.push(o)
      }
    })

    return allContacts.filter(
      o =>
        o.isApprovedVisitor ||
        contactsOnVisit?.some(
          v => v.contactId === o.contactId && v.relationshipToPrisonerCode === o.relationshipToPrisonerCode,
        ),
    )
  }

  public GET = async (req: Request, res: Response, _next?: NextFunction, errors: Record<string, boolean> = {}) => {
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
    const previousDate = req.session.journey.officialVisit?.selectedTimeSlot?.visitDate
    res.render('pages/manage/selectOfficialVisitors', {
      contacts: recallContacts(req.session.journey, 'O', selectableContacts),
      selectedContacts,
      backUrl: getBackLink(req, res, `time-slot${previousDate ? `?date=${previousDate}` : ''}`),
      prisoner: req.session.journey.officialVisit.prisoner,
      hasVisitorOverlap: req.flash('hasVisitorOverlap')[0] === 'true',
      checks: errors,
      visitId: req.session.journey.officialVisit.officialVisitId,
    })
  }

  public POST = async (req: Request, res: Response) => {
    // Use the prison and prisoner details from the session
    const { prisonerNumber } = req.session.journey.officialVisit.prisoner
    const selected: string[] = Array.isArray(req.body.selected) ? req.body.selected : []

    if (!selected.length) {
      return this.GET(req, res, undefined, { empty: true })
    }

    const journeyVisitors = req.session.journey.officialVisit.officialVisitors || []
    const selectableContacts = await this.getSelectableContacts(prisonerNumber, res.locals.user, journeyVisitors)
    const officialContacts = recallContacts(req.session.journey, 'O', selectableContacts)

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

    const errors = await cyaGuard(req, res, this.officialVisitsService)

    if (Object.keys(errors).length > 0) {
      return this.GET(req, res, undefined, errors)
    }

    return res.redirect(socialVisitorsPageEnabled(req) ? `select-social-visitors` : `assistance-required`)
  }
}
