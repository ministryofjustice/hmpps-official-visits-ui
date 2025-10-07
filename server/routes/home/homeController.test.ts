import type { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes, user } from '../testutils/appSetup'

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({
    services: {},
    userSupplier: () => user,
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /', () => {
  it('should render index page', () => {
    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Official Visits')

        // Get the card contents in a better way by finding classes
        expect(res.text).toContain('Book an official visit')
        expect(res.text).toContain('View available slots for official visits')
        expect(res.text).toContain('View or cancel existing official visits')
        expect(res.text).toContain('Administer days, slots and locations for official visits')
      })
  })
})
