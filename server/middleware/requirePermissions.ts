import { NextFunction, Request, Response } from 'express'
import { HmppsUser, Permission } from '../interfaces/hmppsUser'

type Service = keyof HmppsUser['permissions']

const SERVICE_NAMES = {
  OV: 'official visits',
}

export const hasPerm = (mask: number, perm: Permission) => (mask & perm) === perm

export const requirePermissions =
  (service: Service, permissions: Permission) => (_req: Request, res: Response, next: NextFunction) => {
    if (hasPerm(res.locals.user.permissions[service], permissions)) {
      return next()
    }

    return res.render('pages/not-authorised', { serviceName: SERVICE_NAMES[service] })
  }

export const hasPermissionFilter = (user: HmppsUser, permission: Permission, service: Service = 'OV') => {
  return hasPerm(user.permissions[service], permission)
}
