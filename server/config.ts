import { AgentConfig } from '@ministryofjustice/hmpps-rest-client'

const production = process.env.NODE_ENV === 'production'

function get<T>(name: string, fallback: T, options = { requireInProduction: false }): T | string {
  if (process.env[name]) {
    return process.env[name]
  }
  if (fallback !== undefined && (!production || !options.requireInProduction)) {
    return fallback
  }
  throw new Error(`Missing env var ${name}`)
}

const requiredInProduction = { requireInProduction: true }

const auditConfig = () => {
  const auditEnabled = get('AUDIT_ENABLED', 'false') === 'true'
  return {
    enabled: auditEnabled,
    queueUrl: get(
      'AUDIT_SQS_QUEUE_URL',
      'http://localhost:4566/000000000000/mainQueue',
      auditEnabled && requiredInProduction,
    ),
    serviceName: get('AUDIT_SERVICE_NAME', 'UNASSIGNED', auditEnabled && requiredInProduction),
    region: get('AUDIT_SQS_REGION', 'eu-west-2'),
  }
}

export default {
  buildNumber: get('BUILD_NUMBER', '1_0_0', requiredInProduction),
  productId: get('PRODUCT_ID', 'UNASSIGNED', requiredInProduction),
  gitRef: get('GIT_REF', 'xxxxxxxxxxxxxxxxxxx', requiredInProduction),
  branchName: get('GIT_BRANCH', 'xxxxxxxxxxxxxxxxxxx', requiredInProduction),
  production,
  https: process.env.NO_HTTPS === 'true' ? false : production,
  staticResourceCacheDuration: '1h',
  redis: {
    enabled: get('REDIS_ENABLED', 'false', requiredInProduction) === 'true',
    host: get('REDIS_HOST', 'localhost', requiredInProduction),
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_AUTH_TOKEN,
    tls_enabled: get('REDIS_TLS_ENABLED', 'false'),
  },
  session: {
    secret: get('SESSION_SECRET', 'app-insecure-default-session', requiredInProduction),
    expiryMinutes: Number(get('WEB_SESSION_TIMEOUT_IN_MINUTES', 120)),
  },
  apis: {
    hmppsAuth: {
      url: get('HMPPS_AUTH_URL', 'http://localhost:9090/auth', requiredInProduction),
      healthPath: '/health/ping',
      externalUrl: get('HMPPS_AUTH_EXTERNAL_URL', get('HMPPS_AUTH_URL', 'http://localhost:9090/auth')),
      timeout: {
        response: Number(get('HMPPS_AUTH_TIMEOUT_RESPONSE', 10000)),
        deadline: Number(get('HMPPS_AUTH_TIMEOUT_DEADLINE', 10000)),
      },
      agent: new AgentConfig(Number(get('HMPPS_AUTH_TIMEOUT_RESPONSE', 10000))),
      authClientId: get('AUTH_CODE_CLIENT_ID', 'clientid', requiredInProduction),
      authClientSecret: get('AUTH_CODE_CLIENT_SECRET', 'clientsecret', requiredInProduction),
      systemClientId: get('CLIENT_CREDS_CLIENT_ID', 'clientid', requiredInProduction),
      systemClientSecret: get('CLIENT_CREDS_CLIENT_SECRET', 'clientsecret', requiredInProduction),
    },
    componentApi: {
      url: get('COMPONENT_API_URL', 'http://localhost:8082', requiredInProduction),
      timeout: {
        response: Number(get('COMPONENT_API_TIMEOUT_RESPONSE', 2500)),
        deadline: Number(get('COMPONENT_API_TIMEOUT_DEADLINE', 2500)),
      },
      agent: new AgentConfig(Number(get('COMPONENT_API_TIMEOUT_RESPONSE', 2500))),
    },
    tokenVerification: {
      url: get('TOKEN_VERIFICATION_API_URL', 'http://localhost:8100', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('TOKEN_VERIFICATION_API_TIMEOUT_RESPONSE', 5000)),
        deadline: Number(get('TOKEN_VERIFICATION_API_TIMEOUT_DEADLINE', 5000)),
      },
      agent: new AgentConfig(Number(get('TOKEN_VERIFICATION_API_TIMEOUT_RESPONSE', 5000))),
      enabled: get('TOKEN_VERIFICATION_ENABLED', 'false') === 'true',
    },
    locationsInsidePrisonApi: {
      url: get('LOCATIONS_INSIDE_PRISON_API_URL', 'http://localhost:8080', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('LOCATIONS_INSIDE_PRISON_API_TIMEOUT_RESPONSE', 10000)),
        deadline: Number(get('LOCATIONS_INSIDE_PRISON_API_TIMEOUT_DEADLINE', 10000)),
      },
      agent: new AgentConfig(Number(get('LOCATIONS_INSIDE_PRISON_API_TIMEOUT_RESPONSE', 10000))),
    },
    prisonerSearchApi: {
      url: get('PRISONER_SEARCH_API_URL', 'http://localhost:8080', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('PRISONER_SEARCH_API_TIMEOUT_RESPONSE', 20000)),
        deadline: Number(get('PRISONER_SEARCH_API_TIMEOUT_DEADLINE', 20000)),
      },
      agent: new AgentConfig(Number(get('PRISONER_SEARCH_API_TIMEOUT_RESPONSE', 20000))),
      pageSize: 10,
    },
    officialVisitsApi: {
      url: get('OFFICIAL_VISITS_API_URL', 'http://localhost:8080', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('OFFICIAL_VISITS_API_TIMEOUT_RESPONSE', 20000)),
        deadline: Number(get('OFFICIAL_VISITS_API_TIMEOUT_DEADLINE', 20000)),
      },
      agent: new AgentConfig(Number(get('OFFICIAL_VISITS_API_TIMEOUT_RESPONSE', 10000))),
    },
    prisonApi: {
      url: get('PRISON_API_URL', 'http://localhost:8080', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('PRISON_API_TIMEOUT_RESPONSE', 10000)),
        deadline: Number(get('PRISON_API_TIMEOUT_DEADLINE', 10000)),
      },
      agent: new AgentConfig(Number(get('PRISON_API_TIMEOUT_RESPONSE', 10000))),
    },
    personalRelationshipsApi: {
      url: get('PERSONAL_RELATIONSHIPS_API_URL', 'http://localhost:8080', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('PERSONAL_RELATIONSHIPS_API_TIMEOUT_RESPONSE', 30000)),
        deadline: Number(get('PERSONAL_RELATIONSHIPS_API_TIMEOUT_DEADLINE', 35000)),
      },
      agent: new AgentConfig(Number(get('PERSONAL_RELATIONSHIPS_API_TIMEOUT_RESPONSE', 30000))),
      pageSize: 10,
      referenceDataCacheTTL: Number(get('PERSONAL_RELATIONSHIPS_API_REFERENCE_DATA_CACHE_TTL', 5 * 60)),
    },
    activitiesApi: {
      url: get('ACTIVITIES_API_URL', 'http://localhost:8080', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('ACTIVITIES_API_TIMEOUT_RESPONSE', 10000)),
        deadline: Number(get('ACTIVITIES_API_TIMEOUT_DEADLINE', 10000)),
      },
      agent: new AgentConfig(Number(get('ACTIVITIES_API_TIMEOUT_RESPONSE', 10000))),
    },
  },
  serviceUrls: {
    digitalPrison: get('DPS_HOME_PAGE_URL', 'http://localhost:3001', requiredInProduction),
    prisonerProfile: get('PRISONER_PROFILE_URL', 'http://localhost:3001', requiredInProduction),
    prisonerContacts: get('CONTACTS_HOME_PAGE_URL', 'http://localhost:3001', requiredInProduction),
  },
  sqs: {
    audit: auditConfig(),
  },
  ingressUrl: get('INGRESS_URL', 'http://localhost:3000', requiredInProduction),
  environmentName: get('ENVIRONMENT_NAME', ''),
  maintenanceMode: get('MAINTENANCE_MODE', 'false') === 'true',
  featureToggles: {
    allowSocialVisitorsPrisoners: get('ALLOW_SOCIAL_VISITORS_PRISONERS', ''),
  },
}
