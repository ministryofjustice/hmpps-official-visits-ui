import { TelemetryClient } from 'applicationinsights'
import TelemetryService from './telemetryService'
import { HmppsUser, Permission } from '../interfaces/hmppsUser'

jest.mock('applicationinsights')

describe('telemetryService', () => {
  const telemetryClient = new TelemetryClient() as jest.Mocked<TelemetryClient>
  const telemetryService = new TelemetryService(telemetryClient)
  const user: HmppsUser = {
    permissions: { OV: Permission.DEFAULT | Permission.VIEW },
    activeCaseLoadId: 'BXI',
    name: 'User',
    userId: 'user_id',
    token: 'token',
    username: 'username',
    displayName: 'User',
    authSource: 'nomis',
    staffId: 4567,
    userRoles: ['CONTACTS_ADMINISTRATOR'],
  }

  it('should send event with all properties', () => {
    telemetryService.trackEvent('FOO', user, { foo: 'bar', x: 0, y: null })

    expect(telemetryClient.trackEvent).toHaveBeenCalledWith({
      name: 'FOO',
      properties: {
        foo: 'bar',
        x: 0,
        y: null,
        username: 'username',
        activeCaseLoadId: 'BXI',
      },
    })
  })

  it('should not blow up if the telemetry service fails', () => {
    telemetryClient.trackEvent.mockImplementation(() => {
      throw Error('Bang')
    })

    telemetryService.trackEvent('FOO', user, { foo: 'bar', x: 0, y: null })

    expect(telemetryClient.trackEvent).toHaveBeenCalled()
  })
})
