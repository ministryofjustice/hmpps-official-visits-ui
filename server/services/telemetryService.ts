import { telemetry } from '@ministryofjustice/hmpps-azure-telemetry'
import { HmppsUser } from '../interfaces/hmppsUser'
import logger from '../../logger'

export default class TelemetryService {
  trackEvent(name: string, user: HmppsUser, properties?: { [key: string]: string | number | null | undefined }) {
    try {
      const attributes = Object.fromEntries(
        Object.entries({
          ...properties,
          username: user.username,
          activeCaseLoadId: user.activeCaseLoadId,
        }).filter(([, value]) => value !== null && value !== undefined),
      )
      telemetry.trackEvent(name, attributes)
    } catch (error) {
      logger.error('Error sending telemetry event, ', error)
    }
  }
}
