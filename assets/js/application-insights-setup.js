import { ApplicationInsights } from '@microsoft/applicationinsights-web'

if (window.applicationInsightsConnectionString) {
  const init = new ApplicationInsights({
    config: {
      connectionString: window.applicationInsightsConnectionString,
      autoTrackPageVisitTime: true,
    },
  })
  const appInsights = init.loadAppInsights()
  appInsights.addTelemetryInitializer(function (envelope) {
    envelope.tags['ai.cloud.role'] = window.applicationInsightsApplicationName
    envelope.tags['ai.application.ver'] = window.buildNumber
  })
  appInsights.setAuthenticatedUserContext(window.authenticatedUser)
  appInsights.trackPageView()

  initMetricClickEvents(appInsights)
}

function initMetricClickEvents(appInsights) {
  Array.from(document.querySelectorAll('[data-track-click-event]')).forEach(el => {
    if (!el.dataset.trackClickEvent) return

    el.addEventListener('click', () => {
      const name = el.dataset.trackClickEvent
      const properties = el.dataset.trackEventProperties ? JSON.parse(el.dataset.trackEventProperties) : undefined
      const measurements = el.dataset.trackEventMeasurements ? JSON.parse(el.dataset.trackEventMeasurements) : undefined

      appInsights.trackEvent({ name, properties, measurements })
    })
  })
}
