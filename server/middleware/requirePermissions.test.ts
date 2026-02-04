import type { Request, Response, NextFunction } from 'express'
import { requirePermissions, hasPerm, hasPermissionFilter } from './requirePermissions'
import { Permission } from '../interfaces/hmppsUser'
import type { HmppsUser } from '../interfaces/hmppsUser'

describe('hasPerm', () => {
  it('returns true when user has the requested permission', () => {
    const permissions = Permission.DEFAULT | Permission.VIEW
    expect(hasPerm(permissions, Permission.VIEW)).toBe(true)
  })

  it('returns false when the user does not have the requested permission', () => {
    const permissions = Permission.DEFAULT
    expect(hasPerm(permissions, Permission.MANAGE)).toBe(false)
  })

  it('supports requiring multiple permissions', () => {
    const required = Permission.MANAGE | Permission.ADMIN
    const maskMissing = Permission.DEFAULT | Permission.ADMIN
    const maskPresent = Permission.DEFAULT | Permission.MANAGE | Permission.ADMIN

    expect(hasPerm(maskMissing, required)).toBe(false)
    expect(hasPerm(maskPresent, required)).toBe(true)
  })
})

describe('requirePermissions middleware', () => {
  let req: Partial<Request>
  let res: Response
  let next: jest.MockedFunction<NextFunction>

  beforeEach(() => {
    req = {}
    res = {
      locals: {
        user: {
          permissions: {
            OV: 0,
          },
        },
      },
      render: jest.fn(),
    } as unknown as Response
    next = jest.fn()
  })

  it('calls next() when user has required permission', () => {
    res.locals.user.permissions.OV = Permission.DEFAULT | Permission.VIEW

    requirePermissions('OV', Permission.VIEW)(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.render).not.toHaveBeenCalled()
  })

  it('renders not-authorised when user lacks required permission', () => {
    res.locals.user.permissions.OV = Permission.DEFAULT

    requirePermissions('OV', Permission.VIEW)(req as Request, res as Response, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.render).toHaveBeenCalledTimes(1)
    expect(res.render).toHaveBeenCalledWith('pages/not-authorised', {
      serviceName: 'official visits',
    })
  })

  it('works with multi-bit requirements', () => {
    // user has VIEW but not MANAGE
    res.locals.user.permissions.OV = Permission.DEFAULT | Permission.VIEW

    const required = Permission.VIEW | Permission.MANAGE
    requirePermissions('OV', required)(req as Request, res as Response, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.render).toHaveBeenCalledWith('pages/not-authorised', {
      serviceName: 'official visits',
    })
  })

  it('calls next() when multi-bit requirements are satisfied', () => {
    res.locals.user.permissions.OV = Permission.DEFAULT | Permission.VIEW | Permission.MANAGE

    const required = Permission.VIEW | Permission.MANAGE
    requirePermissions('OV', required)(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.render).not.toHaveBeenCalled()
  })

  it('passes correct serviceName for the requested service (OV)', () => {
    res.locals.user.permissions.OV = Permission.DEFAULT

    requirePermissions('OV', Permission.ADMIN)(req as Request, res as Response, next)

    expect(res.render).toHaveBeenCalledWith('pages/not-authorised', {
      serviceName: 'official visits',
    })
  })

  it('does not call res.render when authorised', () => {
    res.locals.user.permissions.OV = Permission.DEFAULT | Permission.ADMIN

    requirePermissions('OV', Permission.ADMIN)(req as Request, res as Response, next)

    expect(res.render).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})

describe('hasPermissionFilter', () => {
  it('supports single bit requirements', () => {
    const user = {
      permissions: { OV: Permission.DEFAULT | Permission.VIEW },
    } as unknown as HmppsUser

    expect(hasPermissionFilter(user, Permission.VIEW)).toBe(true)
    expect(hasPermissionFilter(user, Permission.VIEW, 'OV')).toBe(true)
    expect(hasPermissionFilter(user, Permission.MANAGE)).toBe(false)
    expect(hasPermissionFilter(user, Permission.MANAGE, 'OV')).toBe(false)
  })

  it('supports multi-bit requirements', () => {
    const user = {
      permissions: { OV: Permission.DEFAULT | Permission.VIEW | Permission.MANAGE },
    } as unknown as HmppsUser

    expect(hasPermissionFilter(user, Permission.VIEW | Permission.MANAGE)).toBe(true)
    expect(hasPermissionFilter(user, Permission.VIEW | Permission.ADMIN)).toBe(false)
  })
})
