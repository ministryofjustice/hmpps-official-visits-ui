/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path'
import nunjucks from 'nunjucks'
import express from 'express'
import fs from 'fs'
import { flatten, groupBy, map } from 'lodash'
import { convertToTitleCase, dateAtTime, formatDate, initialiseName, parseDate } from './utils'
import { FieldValidationError } from '../middleware/setUpFlash'
import config from '../config'
import logger from '../../logger'

export default function nunjucksSetup(app: express.Express): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'Manage Official Visits'
  app.locals.environmentName = config.environmentName
  app.locals.environmentNameColour = config.environmentName === 'PRE-PRODUCTION' ? 'govuk-tag--green' : ''
  app.locals.digitalPrisonServicesUrl = config.serviceUrls.digitalPrison
  app.locals.prisonerProfileUrl = config.serviceUrls.prisonerProfile
  app.locals.authUrl = config.apis.hmppsAuth.externalUrl

  app.use((_req, res, next) => {
    res.locals.digitalPrisonServicesUrl = config.serviceUrls.digitalPrison
    return next()
  })

  let assetManifest: Record<string, string> = {}

  try {
    const assetMetadataPath = path.resolve(__dirname, '../../assets/manifest.json')
    assetManifest = JSON.parse(fs.readFileSync(assetMetadataPath, 'utf8'))
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error(e, 'Could not read asset manifest file')
    }
  }

  const njkEnv = nunjucks.configure(
    [
      path.join(__dirname, '../../server/views'),
      'node_modules/govuk-frontend/dist/',
      'node_modules/@ministryofjustice/frontend/',
      'node_modules/@ministryofjustice/hmpps-connect-dps-components/dist/assets/',
    ],
    {
      autoescape: true,
      express: app,
    },
  )

  njkEnv.addFilter('initialiseName', initialiseName)
  njkEnv.addFilter('convertToTitleCase', convertToTitleCase)
  njkEnv.addFilter('map', map)
  njkEnv.addFilter('flatten', flatten)
  njkEnv.addFilter('groupBy', groupBy)
  njkEnv.addFilter('assetMap', (url: string) => assetManifest[url] || url)
  njkEnv.addFilter('find', (l: any[], iteratee: string, eq: unknown) => l.find(o => o[iteratee] === eq))
  njkEnv.addFilter('filter', (l: any[], iteratee: string, eq: unknown) => l.filter(o => o[iteratee] === eq))
  njkEnv.addFilter('findError', (v: FieldValidationError[], i: string) => v?.find(e => e.fieldId === i))
  njkEnv.addFilter('parseDate', parseDate)
  njkEnv.addFilter('formatDate', formatDate)
  njkEnv.addFilter('dateAtTime', dateAtTime)
  njkEnv.addFilter('selected', (items: any[], selected: string) =>
    items.map(o => ({ ...o, checked: o.value === selected })),
  )
  njkEnv.addFilter('includes', (items: any[], selected: string) => items.includes(selected))
  njkEnv.addFilter('possessiveComma', (name: string) => (name.endsWith('s') ? `${name}’` : `${name}’s`))
}
