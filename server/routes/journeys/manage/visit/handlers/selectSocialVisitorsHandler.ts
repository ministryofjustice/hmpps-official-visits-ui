import { Request, Response } from 'express'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { JourneyVisitor } from '../journey'

export default class SelectSocialVisitorsHandler implements PageHandler {
  public PAGE_NAME = Page.SELECT_SOCIAL_VISITORS_PAGE

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public GET = async (req: Request, res: Response) => {
    const { prisonCode, prisonerNumber } = req.session.journey.officialVisit.prisoner
    const restrictions = await this.officialVisitsService.getActiveRestrictions(res, prisonCode, prisonerNumber)
    // Could just use the previously cached data from the official contacts page
    // But might be wise to refresh in case the user comes back to this page later or adds a new contact and refreshes the page
    const contacts = await this.officialVisitsService.getOfficialContacts(res, prisonCode, prisonerNumber)
    const selectedContacts =
      res.locals.formResponses?.selected || req.session.journey.officialVisit.socialVisitors?.map(v => v.id) || []

    // req.session.journey.officialVisit.prisoner.restrictions = restrictions
    req.session.journey.officialVisit.prisoner.contacts = contacts

    res.render('pages/manage/selectSocialVisitors', {
      restrictions,
      contacts: contacts.filter(o => o.visitorTypeCode === 'SOCIAL'),
      selectedContacts,
      backUrl: `select-official-visitors`,
      prisoner: req.session.journey.officialVisit.prisoner,
    })
  }

  public POST = async (req: Request, res: Response) => {
    // Validation - do we ensure all ids are found? Do we fetch a fresh list on POST?
    req.session.journey.officialVisit.socialVisitors = (req.body.selected || []).map((o: number) => {
      const contact = req.session.journey.officialVisit.prisoner.contacts.find(c => c.id === Number(o))
      return {
        ...contact,
        // assistedVisit: false,
        // leadVisitor: false,
        // notes: '',
      } as JourneyVisitor
    })
    return res.redirect(`assistance-required`)
  }
}
