import type { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes } from './routes/testutils/appSetup'
import logger from '../logger'
import createErrorHandler from './errorHandler'

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({})
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET 404', () => {
  it('should render content with stack in dev mode', () => {
    // Suppress the expected error output
    logger.error = jest.fn()

    return request(app)
      .get('/unknown')
      .expect(404)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('NotFoundError: Not Found')
        expect(res.text).not.toContain('Something went wrong. The error has been logged. Please try again')
      })
  })

  it('should render content without stack in production mode', () => {
    // Suppress the expected error output
    logger.error = jest.fn()

    return request(appWithAllRoutes({ production: true }))
      .get('/unknown')
      .expect(404)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('Something went wrong. The error has been logged. Please try again')
        expect(res.text).not.toContain('NotFoundError: Not Found')
      })
  })
})

describe('createErrorHandler', () => {
  it('uses responseStatus from API client errors', () => {
    logger.error = jest.fn()
    const res = { locals: {}, status: jest.fn(), render: jest.fn(), redirect: jest.fn() }
    const error = Object.assign(new Error('Not found'), { responseStatus: 404 })

    createErrorHandler(false)(error as never, { originalUrl: '/x' } as never, res as never, jest.fn())

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.render).toHaveBeenCalledWith('pages/error')
  })

  it('redirects to sign out on responseStatus 401', () => {
    logger.error = jest.fn()
    logger.info = jest.fn()
    const res = { locals: {}, status: jest.fn(), render: jest.fn(), redirect: jest.fn() }
    const error = Object.assign(new Error('Unauthorized'), { responseStatus: 401 })

    createErrorHandler(false)(error as never, { originalUrl: '/x' } as never, res as never, jest.fn())

    expect(res.redirect).toHaveBeenCalledWith('/sign-out')
  })
})
