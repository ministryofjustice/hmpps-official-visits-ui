import { HmppsUser } from '../../interfaces/hmppsUser'
import { Breadcrumbs } from '../../middleware/breadcrumbs'
import { OfficialVisitJourney } from '../../routes/journeys/manage/visit/journey'

export interface JourneyData extends Journey {
  instanceUnixEpoch: number
}

export interface Journey {
  officialVisit?: OfficialVisitJourney
}

export declare module 'express-session' {
  // Declare that the session will potentially contain these additional fields
  interface SessionData {
    returnTo: string
    nowInMinutes: number
    journey: Journey
    journeyData: Record<string, JourneyData>
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    rawBody: object
    routeContext?: { mode?: string; type?: string }
  }

  interface Response {
    addSuccessMessage?(heading: string, message?: string): void
    addValidationError?(message: string, field?: string): void
    validationFailed?(message?: string, field?: string): void
  }
}

export declare global {
  namespace Express {
    interface User {
      username: string
      token: string
      authSource: string
    }

    interface Request {
      verified?: boolean
      id: string
      logout(done: (err: unknown) => void): void
    }

    interface Locals {
      user: HmppsUser
      formResponses?: { [key: string]: string }
      breadcrumbs: Breadcrumbs
      digitalPrisonServicesUrl?: string
      buildNumber?: string
      applicationName?: string
      environmentName?: string
      feComponents?: {
        sharedData?: {
          activeCaseLoad: CaseLoad
          caseLoads: CaseLoad[]
          services: {
            id: string
            heading: string
            description: string
            href: string
            navEnabled: boolean
          }[]
        }
      }
      historyBackUrl?: string
      history?: string[]
    }
  }
}
