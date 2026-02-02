import type { Request, Response, NextFunction } from 'express'
import { populateUserPermissions, AuthorisedRoles } from './populateUserPermissions'
import { BitPermission } from '../interfaces/hmppsUser'

describe('populateUserPermissions middleware', () => {
  let req: Partial<Request>
  let res: Response
  let next: jest.MockedFunction<NextFunction>

  beforeEach(() => {
    req = {}
    res = { locals: { user: { userRoles: [], permissions: { OV: BitPermission.DEFAULT } } } } as unknown as Response
    next = jest.fn()
  })

  it('sets DEFAULT when no roles are present (userRoles undefined)', () => {
    res.locals.user.userRoles = undefined

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(BitPermission.DEFAULT)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('sets DEFAULT when roles array is empty', () => {
    res.locals.user.userRoles = []

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(BitPermission.DEFAULT)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('ORs VIEW into the permission mask when VIEW role is present', () => {
    res.locals.user.userRoles = [AuthorisedRoles.VIEW]

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(BitPermission.DEFAULT | BitPermission.VIEW)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('ORs MANAGE into the permission mask and also implies VIEW via normalizeOV', () => {
    res.locals.user.userRoles = [AuthorisedRoles.MANAGE]

    populateUserPermissions(req as Request, res as Response, next)

    // DEFAULT always present + MANAGE + implied VIEW
    expect(res.locals.user.permissions.OV).toBe(BitPermission.DEFAULT | BitPermission.MANAGE | BitPermission.VIEW)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('MANAGE + VIEW stays equivalent (VIEW already present, normalize keeps it)', () => {
    res.locals.user.userRoles = [AuthorisedRoles.VIEW, AuthorisedRoles.MANAGE]

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(BitPermission.DEFAULT | BitPermission.MANAGE | BitPermission.VIEW)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('ORs ADMIN into the permission mask (and includes DEFAULT)', () => {
    res.locals.user.userRoles = [AuthorisedRoles.ADMIN]

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(BitPermission.DEFAULT | BitPermission.ADMIN)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('ignores unknown roles (does not throw, keeps DEFAULT)', () => {
    res.locals.user.userRoles = ['SOME_UNKNOWN_ROLE']

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(BitPermission.DEFAULT)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('accumulates multiple roles (DEFAULT + VIEW + ADMIN)', () => {
    res.locals.user.userRoles = [AuthorisedRoles.VIEW, AuthorisedRoles.ADMIN]

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(BitPermission.DEFAULT | BitPermission.VIEW | BitPermission.ADMIN)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
