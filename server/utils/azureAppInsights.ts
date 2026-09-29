import { initialiseTelemetry, telemetry } from '@ministryofjustice/hmpps-azure-telemetry'
import applicationInfoSupplier from '../applicationInfo'

const { applicationName, buildNumber } = applicationInfoSupplier()

initialiseTelemetry({
  serviceName: applicationName,
  serviceVersion: buildNumber,
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  debug: process.env.DEBUG_TELEMETRY === 'true',
})
  .addFilter(telemetry.processors.filterSpanWherePath(['/health', '/ping', '/info', '/assets/*', '/favicon.ico']))
  .addModifier(telemetry.processors.enrichSpanNameWithHttpRoute())
  .startRecording()
