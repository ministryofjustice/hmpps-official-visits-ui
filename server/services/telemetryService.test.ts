import { telemetry } from '@ministryofjustice/hmpps-azure-telemetry'
import TelemetryService from './telemetryService'
import { HmppsUser, Permission } from '../interfaces/hmppsUser'

jest.mock('@ministryofjustice/hmpps-azure-telemetry', () => ({
  telemetry: { trackEvent: jest.fn() },
}))

describe('telemetryService', () => {
  const mockTrackEvent = telemetry.trackEvent as jest.Mock
  const telemetryService = new TelemetryService()
  const user: HmppsUser = {
    name: 'User',
    userId: 'user_id',
    userUuid: '11111111-1111-1111-1111-111111111111',
    token: 'token',
    username: 'username',
    displayName: 'User',
    authSource: 'nomis',
    staffId: 4567,
    userRoles: ['CONTACTS_ADMINISTRATOR'],
    activeCaseLoadId: 'BXI',
    permissions: { OV: Permission.DEFAULT | Permission.VIEW },
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should send event with all properties, dropping null/undefined values', () => {
    telemetryService.trackEvent('FOO', user, { foo: 'bar', x: 0, y: null })

    expect(mockTrackEvent).toHaveBeenCalledWith('FOO', {
      foo: 'bar',
      x: 0,
      username: 'username',
      activeCaseLoadId: 'BXI',
    })
  })

  it('should accept boolean properties', () => {
    telemetryService.trackEvent('FOO', user, { flag: true, otherFlag: false })

    expect(mockTrackEvent).toHaveBeenCalledWith('FOO', {
      flag: true,
      otherFlag: false,
      username: 'username',
      activeCaseLoadId: 'BXI',
    })
  })

  it('should not blow up if the telemetry service fails', () => {
    mockTrackEvent.mockImplementation(() => {
      throw Error('Bang')
    })

    telemetryService.trackEvent('FOO', user, { foo: 'bar', x: 0, y: null })

    expect(mockTrackEvent).toHaveBeenCalled()
  })
})
