import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import { AuthorisedRoles } from '../../../../../middleware/populateUserPermissions'

jest.mock('../../../../../services/auditService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express

const appSetup = (userRoles: string[]) => {
  app = appWithAllRoutes({
    services: { auditService },
    userSupplier: () => ({ ...user, userRoles }),
    journeySessionSupplier: () => ({ officialVisit: { prisoner: { firstName: 'Neil', lastName: 'Rudge' } } }),
  })
}

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/no-video-capacity`

describe('No video capacity handler', () => {
  it('should show the manage schedule option to admin users', () => {
    appSetup([AuthorisedRoles.MANAGE, AuthorisedRoles.ADMIN])
    return request(app)
      .get(URL)
      .expect('Content-Type', /html/)
      .expect(res => {
        const $ = cheerio.load(res.text)

        expect($('.moj-interruption-card__heading').text()).toEqual(
          'This prison does not have video visit capacity set up in its schedule',
        )
        expect($('.moj-progress-bar').length).toBeTruthy()
        expect($('.moj-interruption-card__body').text()).toContain('select manage schedule button')

        const manageSchedule = $('.moj-interruption-card__actions .govuk-button')
        expect(manageSchedule.text().trim()).toEqual('Manage schedule')
        expect(manageSchedule.attr('href')).toEqual('/admin/time-slots')
        expect(manageSchedule.attr('target')).toEqual('_blank')

        const returnLink = $('.moj-interruption-card__actions .govuk-link')
        expect(returnLink.text().trim()).toEqual('Return to visit type')
        expect(returnLink.attr('href')).toEqual('visit-type')

        expect(auditService.logPageView).toHaveBeenCalledWith(Page.NO_VIDEO_CAPACITY_PAGE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })

  it('should tell non-admin users to ask for the role', () => {
    appSetup([AuthorisedRoles.MANAGE])
    return request(app)
      .get(URL)
      .expect('Content-Type', /html/)
      .expect(res => {
        const $ = cheerio.load(res.text)

        expect($('.moj-interruption-card__body').text()).toContain(
          'ask a member of staff with the Official Visits Manage Time Slots role',
        )
        expect($('.moj-interruption-card__actions a').length).toEqual(1)

        const returnButton = $('.moj-interruption-card__actions .govuk-button')
        expect(returnButton.text().trim()).toEqual('Return to visit type')
        expect(returnButton.attr('href')).toEqual('visit-type')
        expect(res.text).not.toContain('/admin/time-slots')
      })
  })
})
