import { RequestHandler } from 'express'
import { Permission } from '../interfaces/hmppsUser'

export enum AuthorisedRoles {
  DEFAULT = 'PRISON',
  VIEW = 'OFFVIS_VIEW_ONLY',
  MANAGE = 'OFFVIS_MANAGE',
  ADMIN = 'OFFVIS_ADMIN_USER',
  CONTACTS_AUTHORISER = 'CONTACTS_AUTHORISER',
}

const roleMap: Record<string, Permission> = {
  [AuthorisedRoles.DEFAULT]: Permission.DEFAULT,
  [AuthorisedRoles.VIEW]: Permission.VIEW,
  [AuthorisedRoles.MANAGE]: Permission.MANAGE,
  [AuthorisedRoles.ADMIN]: Permission.ADMIN,
  [AuthorisedRoles.CONTACTS_AUTHORISER]: Permission.CONTACTS_AUTHORISER,
}

/** Ensure any OFFVIS roles result in DEFAULT being added. And users with MANAGE also get VIEW */
function normaliseOV(mask: number): number {
  const hasAnyOV = (mask & (Permission.VIEW | Permission.MANAGE | Permission.ADMIN)) !== 0
  const withDefault = hasAnyOV ? mask | Permission.DEFAULT : mask
  return withDefault & Permission.MANAGE ? withDefault | Permission.VIEW : withDefault
}

export const populateUserPermissions: RequestHandler = (_req, res, next) => {
  const roles: string[] = res.locals.user.userRoles ?? []

  let mask = 0
  for (const r of roles) mask |= roleMap[r] ?? 0

  res.locals.user.permissions = { OV: normaliseOV(mask) }
  return next()
}
