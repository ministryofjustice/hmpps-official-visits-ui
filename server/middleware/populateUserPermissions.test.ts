import type { Request, Response, NextFunction } from 'express'
import { populateUserPermissions, AuthorisedRoles } from './populateUserPermissions'
import { Permission } from '../interfaces/hmppsUser'

describe('populateUserPermissions middleware', () => {
  let req: Partial<Request>
  let res: Response
  let next: jest.MockedFunction<NextFunction>

  beforeEach(() => {
    req = {}
    res = { locals: { user: { userRoles: [], permissions: { OV: 0 } } } } as unknown as Response
    next = jest.fn()
  })

  it('grants DEFAULT only when PRISON role is present or the user has other OFFVIS roles', () => {
    res.locals.user.userRoles = []
    populateUserPermissions(req as Request, res as Response, next)
    expect(res.locals.user.permissions.OV & Permission.DEFAULT).toBe(0)

    res.locals.user.userRoles = ['PRISON']
    populateUserPermissions(req as Request, res as Response, next)
    expect(res.locals.user.permissions.OV & Permission.DEFAULT).toBe(Permission.DEFAULT)

    res.locals.user.userRoles = [AuthorisedRoles.MANAGE]
    populateUserPermissions(req as Request, res as Response, next)
    expect(res.locals.user.permissions.OV & Permission.DEFAULT).toBe(Permission.DEFAULT)

    res.locals.user.userRoles = [AuthorisedRoles.VIEW]
    populateUserPermissions(req as Request, res as Response, next)
    expect(res.locals.user.permissions.OV & Permission.DEFAULT).toBe(Permission.DEFAULT)

    res.locals.user.userRoles = [AuthorisedRoles.ADMIN]
    populateUserPermissions(req as Request, res as Response, next)
    expect(res.locals.user.permissions.OV & Permission.DEFAULT).toBe(Permission.DEFAULT)
  })

  it('ORs VIEW into the permission mask when VIEW role is present', () => {
    res.locals.user.userRoles = [AuthorisedRoles.VIEW]

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(Permission.DEFAULT | Permission.VIEW)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('ORs MANAGE into the permission mask and also implies VIEW via normalizeOV', () => {
    res.locals.user.userRoles = [AuthorisedRoles.MANAGE]

    populateUserPermissions(req as Request, res as Response, next)

    // DEFAULT always present + MANAGE + implied VIEW
    expect(res.locals.user.permissions.OV).toBe(Permission.DEFAULT | Permission.MANAGE | Permission.VIEW)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('MANAGE + VIEW stays equivalent (VIEW already present, normalize keeps it)', () => {
    res.locals.user.userRoles = [AuthorisedRoles.VIEW, AuthorisedRoles.MANAGE]

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(Permission.DEFAULT | Permission.MANAGE | Permission.VIEW)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('ORs ADMIN into the permission mask (and includes DEFAULT)', () => {
    res.locals.user.userRoles = [AuthorisedRoles.ADMIN]

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(Permission.DEFAULT | Permission.ADMIN)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('ignores unknown roles (does not throw, keeps DEFAULT)', () => {
    res.locals.user.userRoles = ['SOME_UNKNOWN_ROLE']

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(0)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('accumulates multiple roles (DEFAULT + VIEW + ADMIN)', () => {
    res.locals.user.userRoles = [AuthorisedRoles.VIEW, AuthorisedRoles.ADMIN]

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(Permission.DEFAULT | Permission.VIEW | Permission.ADMIN)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('ORs  CONTACTS_AUTHORISER into the permission mask (and should not includes DEFAULT)', () => {
    res.locals.user.userRoles = [AuthorisedRoles.CONTACTS_AUTHORISER]

    populateUserPermissions(req as Request, res as Response, next)

    expect(res.locals.user.permissions.OV).toBe(Permission.CONTACTS_AUTHORISER)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
