import type { Request, Response, NextFunction } from 'express'
import { requirePermissions, hasPerm, hasPermissionFilter } from './requirePermissions'
import { BitPermission } from '../interfaces/hmppsUser'
import type { HmppsUser } from '../interfaces/hmppsUser'

describe('hasPerm', () => {
  it('returns true when all required bits are present', () => {
    const mask = BitPermission.DEFAULT | BitPermission.VIEW
    expect(hasPerm(mask, BitPermission.VIEW)).toBe(true)
  })

  it('returns false when any required bit is missing', () => {
    const mask = BitPermission.DEFAULT
    expect(hasPerm(mask, BitPermission.MANAGE)).toBe(false)
  })

  it('supports multi-bit requirements', () => {
    const required = BitPermission.MANAGE | BitPermission.MANAGE
    const maskMissing = BitPermission.DEFAULT | BitPermission.ADMIN
    const maskPresent = BitPermission.DEFAULT | BitPermission.MANAGE | BitPermission.ADMIN

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
    res.locals.user.permissions.OV = BitPermission.DEFAULT | BitPermission.VIEW

    requirePermissions('OV', BitPermission.VIEW)(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.render).not.toHaveBeenCalled()
  })

  it('renders not-authorised when user lacks required permission', () => {
    res.locals.user.permissions.OV = BitPermission.DEFAULT

    requirePermissions('OV', BitPermission.VIEW)(req as Request, res as Response, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.render).toHaveBeenCalledTimes(1)
    expect(res.render).toHaveBeenCalledWith('pages/not-authorised', {
      serviceName: 'official visits',
    })
  })

  it('works with multi-bit requirements', () => {
    // user has VIEW but not MANAGE
    res.locals.user.permissions.OV = BitPermission.DEFAULT | BitPermission.VIEW

    const required = BitPermission.VIEW | BitPermission.MANAGE
    requirePermissions('OV', required)(req as Request, res as Response, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.render).toHaveBeenCalledWith('pages/not-authorised', {
      serviceName: 'official visits',
    })
  })

  it('calls next() when multi-bit requirements are satisfied', () => {
    res.locals.user.permissions.OV = BitPermission.DEFAULT | BitPermission.VIEW | BitPermission.MANAGE

    const required = BitPermission.VIEW | BitPermission.MANAGE
    requirePermissions('OV', required)(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.render).not.toHaveBeenCalled()
  })

  it('passes correct serviceName for the requested service (OV)', () => {
    res.locals.user.permissions.OV = BitPermission.DEFAULT

    requirePermissions('OV', BitPermission.ADMIN)(req as Request, res as Response, next)

    expect(res.render).toHaveBeenCalledWith('pages/not-authorised', {
      serviceName: 'official visits',
    })
  })

  it('does not call res.render when authorised', () => {
    res.locals.user.permissions.OV = BitPermission.DEFAULT | BitPermission.ADMIN

    requirePermissions('OV', BitPermission.ADMIN)(req as Request, res as Response, next)

    expect(res.render).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})

describe('hasPermissionFilter', () => {
  it('supports single bit requirements', () => {
    const user = {
      permissions: { OV: BitPermission.DEFAULT | BitPermission.VIEW },
    } as unknown as HmppsUser

    expect(hasPermissionFilter(user, BitPermission.VIEW)).toBe(true)
    expect(hasPermissionFilter(user, BitPermission.VIEW, 'OV')).toBe(true)
    expect(hasPermissionFilter(user, BitPermission.MANAGE)).toBe(false)
    expect(hasPermissionFilter(user, BitPermission.MANAGE, 'OV')).toBe(false)
  })

  it('supports multi-bit requirements', () => {
    const user = {
      permissions: { OV: BitPermission.DEFAULT | BitPermission.VIEW | BitPermission.MANAGE },
    } as unknown as HmppsUser

    expect(hasPermissionFilter(user, BitPermission.VIEW | BitPermission.MANAGE)).toBe(true)
    expect(hasPermissionFilter(user, BitPermission.VIEW | BitPermission.ADMIN)).toBe(false)
  })
})
