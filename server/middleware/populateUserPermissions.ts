import { RequestHandler, Response } from 'express'
import { UserPermissionLevel } from '../interfaces/hmppsUser'

export enum AuthorisedRoles {
  OFFICIAL_VISITS__OV_RO = 'OFFICIAL_VISITS__OV_RO',
  OFFICIAL_VISITS__OV_RW = 'OFFICIAL_VISITS__OV_RW',
}

const hasRole = (res: Response, ...roles: AuthorisedRoles[]) =>
  roles.some(role => res.locals.user.userRoles.includes(role))

export const populateUserPermissions: RequestHandler = async (_req, res, next) => {
  res.locals.user.permissions = {
    OV: UserPermissionLevel.DEFAULT,
  }

  if (hasRole(res, AuthorisedRoles.OFFICIAL_VISITS__OV_RW)) {
    res.locals.user.permissions.OV = UserPermissionLevel.MANAGE
  } else if (hasRole(res, AuthorisedRoles.OFFICIAL_VISITS__OV_RO)) {
    res.locals.user.permissions.OV = UserPermissionLevel.VIEW_ONLY
  }

  return next()
}
