import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import PrisonerService from '../../../../../services/prisonerService'

export default class CheckYourAnswersHandler implements PageHandler {
  public PAGE_NAME = Page.CHECK_YOUR_ANSWERS_PAGE

  constructor(
    private readonly officialVisitsService: OfficialVisitsService,
    private readonly prisonerService: PrisonerService,
  ) {}

  public GET = async (req: Request, res: Response) => {
    const { officialVisit } = req.session.journey
    const { prisoner } = officialVisit
    req.session.journey.reachedCheckAnswers = true
    return res.render('pages/manage/checkYourAnswers', {
      raw: JSON.stringify(officialVisit, null, 2),
      officialVisit,
      prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    const { user } = res.locals
    const { mode } = req.routeContext

    const visit = req.session.journey.officialVisit
    const timeSlot = visit.selectedTimeSlot

    if (mode === 'create') {
      // I see this happening by passing the journey session into a method in the
      // officialVisitsService, and have it translate the session data into the
      // createVisitRequest type required by the API.
      const id = await this.officialVisitsService.createVisit(
        {
          prisonVisitSlotId: timeSlot.visitSlotId,
          prisonCode: visit.prisonCode,
          prisonerNumber: visit.prisoner.prisonerNumber,
          visitDate: timeSlot.visitDate,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          dpsLocationId: timeSlot.dpsLocationId,
          visitTypeCode: visit.visitType,
          staffNotes: '<TODO>',
          prisonerNotes: '<TODO>',
          officialVisitors: [...visit.officialVisitors, ...visit.socialVisitors].map(o => ({
            visitorTypeCode: 'CONTACT',
            contactTypeCode: o.relationshipTypeCode,
            contactId: o.contactId,
            prisonerContactId: o.prisonerContactId,
            firstName: o.firstName,
            lastName: o.lastName,
            leadVisitor: o.leadVisitor,
            assistVisit: o.assistedVisit,
            relationshipTypeCode: o.relationshipTypeCode,
            relationshipTypeDescription: o.relationshipTypeDescription,
            visitorNotes: o.assistanceNotes,
          })),
        },
        user,
      )
      return res.redirect(`confirmation/${id}`)
    }

    if (mode === 'amend') {
      // Similar to above here - pass the session info and have it produce the required request type
      await this.officialVisitsService.amendVisit(req.session.journey.officialVisit, user)
    }

    return res.redirect(`confirmation`)
  }
}
