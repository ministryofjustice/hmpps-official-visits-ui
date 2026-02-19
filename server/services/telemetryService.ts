import { TelemetryClient } from 'applicationinsights'
import { HmppsUser } from '../interfaces/hmppsUser'
import logger from '../../logger'

export default class TelemetryService {
  // nullable in environments without app insights
  constructor(private readonly applicationInsightsClient: TelemetryClient | null) {}

  trackEvent(name: string, user: HmppsUser, properties?: { [key: string]: string | number | null | undefined }) {
    if (this.applicationInsightsClient) {
      try {
        this.applicationInsightsClient.trackEvent({
          name,
          properties: {
            ...properties,
            username: user.username,
            activeCaseLoadId: user.activeCaseLoadId,
          },
        })
      } catch (error) {
        logger.error('Error sending telemetry event, ', error)
      }
    }
  }
}
