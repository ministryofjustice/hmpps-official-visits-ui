import { RequestHandler } from 'express'
import { BitPermission } from '../interfaces/hmppsUser'

export enum AuthorisedRoles {
  DEFAULT = 'PRISON',
  VIEW = 'OFFVIS_VIEW_ONLY',
  MANAGE = 'OFFVIS_MANAGE',
  ADMIN = 'OFFVIS_ADMIN_USER',
}

const roleMap: Record<string, BitPermission> = {
  [AuthorisedRoles.DEFAULT]: BitPermission.DEFAULT,
  [AuthorisedRoles.VIEW]: BitPermission.VIEW,
  [AuthorisedRoles.MANAGE]: BitPermission.MANAGE,
  [AuthorisedRoles.ADMIN]: BitPermission.ADMIN,
}

/** Everyone has DEFAULT permission already but ensure that MANAGE also has VIEW */
function normaliseOV(mask: number): number {
  return mask & BitPermission.MANAGE ? mask | BitPermission.VIEW : mask
}

export const populateUserPermissions: RequestHandler = (_req, res, next) => {
  const roles: string[] = res.locals.user.userRoles ?? []

  let mask = BitPermission.DEFAULT
  for (const r of roles) mask |= roleMap[r] ?? 0

  res.locals.user.permissions = { OV: normaliseOV(mask) }
  return next()
}
