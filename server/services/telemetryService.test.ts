import { telemetry } from '@ministryofjustice/hmpps-azure-telemetry'
import TelemetryService from './telemetryService'
import { HmppsUser, Permission } from '../interfaces/hmppsUser'

jest.mock('@ministryofjustice/hmpps-azure-telemetry', () => ({ telemetry: { trackEvent: jest.fn() } }))

describe('telemetryService', () => {
  const trackEvent = jest.mocked(telemetry.trackEvent)
  const telemetryService = new TelemetryService()
  const user: HmppsUser = {
    permissions: { OV: Permission.DEFAULT | Permission.VIEW },
    activeCaseLoadId: 'BXI',
    name: 'User',
    userId: 'user_id',
    userUuid: '11111111-1111-1111-1111-111111111111',
    token: 'token',
    username: 'username',
    displayName: 'User',
    authSource: 'nomis',
    staffId: 4567,
    userRoles: ['CONTACTS_ADMINISTRATOR'],
  }

  it('should send event with all populated properties', () => {
    telemetryService.trackEvent('FOO', user, { foo: 'bar', x: 0, y: null, z: undefined })

    expect(trackEvent).toHaveBeenCalledWith('FOO', {
      foo: 'bar',
      x: 0,
      username: 'username',
      activeCaseLoadId: 'BXI',
    })
  })

  it('should not blow up if the telemetry service fails', () => {
    trackEvent.mockImplementation(() => {
      throw Error('Bang')
    })

    telemetryService.trackEvent('FOO', user, { foo: 'bar', x: 0, y: null })

    expect(trackEvent).toHaveBeenCalled()
  })
})
