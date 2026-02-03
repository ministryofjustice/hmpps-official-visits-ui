import { RequestHandler } from 'express'
import { Permission } from '../interfaces/hmppsUser'

export enum AuthorisedRoles {
  DEFAULT = 'PRISON',
  VIEW = 'OFFVIS_VIEW_ONLY',
  MANAGE = 'OFFVIS_MANAGE',
  ADMIN = 'OFFVIS_ADMIN_USER',
}

const roleMap: Record<string, Permission> = {
  [AuthorisedRoles.DEFAULT]: Permission.DEFAULT,
  [AuthorisedRoles.VIEW]: Permission.VIEW,
  [AuthorisedRoles.MANAGE]: Permission.MANAGE,
  [AuthorisedRoles.ADMIN]: Permission.ADMIN,
}

/** Everyone has DEFAULT permission already but ensure that MANAGE also has VIEW */
function normaliseOV(mask: number): number {
  return mask & Permission.MANAGE ? mask | Permission.VIEW : mask
}

export const populateUserPermissions: RequestHandler = (_req, res, next) => {
  const roles: string[] = res.locals.user.userRoles ?? []

  let mask = Permission.DEFAULT
  for (const r of roles) mask |= roleMap[r] ?? 0

  res.locals.user.permissions = { OV: normaliseOV(mask) }
  return next()
}
