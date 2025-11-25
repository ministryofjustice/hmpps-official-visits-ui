import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'

export default class SelectOfficialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_OFFICIAL_VISITORS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const { prisonCode, prisonerNumber } = req.session.journey.officialVisit.prisoner
    const restrictions = await this.officialVisitsService.getActiveRestrictions(res, prisonCode, prisonerNumber)
    // One call to contacts and save on journey data so we don't need to make another call on the next page
    // - although maybe we should still call again if the ability to add contacts exists
    const contacts = await this.officialVisitsService.getOfficialContacts(res, prisonCode, prisonerNumber)
    const selectedContacts =
      res.locals.formResponses?.selected || req.session.journey.officialVisit.officialVisitors?.map(v => v.id) || []

    // req.session.journey.officialVisit.prisoner.restrictions = restrictions
    req.session.journey.officialVisit.prisoner.contacts = contacts

    res.render('pages/manage/selectOfficialVisitors', {
      restrictions,
      contacts: contacts.filter(o => o.visitorTypeCode === 'OFFICIAL'),
      selectedContacts,
      backUrl: `time-slot`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    // Validation - do we ensure all ids are found? Do we fetch a fresh list on POST?
    req.session.journey.officialVisit.officialVisitors = (req.body.selected || []).map((o: number) => {
      const contact = req.session.journey.officialVisit.prisoner.contacts.find(c => c.id === Number(o))
      return {
        ...contact,
        // assistedVisit: false,
        // leadVisitor: false,
        // notes: '',
      } as JourneyVisitor
    })

    return res.redirect(`select-social-visitors`)
  }
}
