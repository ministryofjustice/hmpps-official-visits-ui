import { HmppsUser } from '../../interfaces/hmppsUser'
import { Breadcrumbs } from '../../middleware/breadcrumbs'

export declare module 'express-session' {
  // Declare that the session will potentially contain these additional fields
  interface SessionData {
    returnTo: string
    nowInMinutes: number
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
