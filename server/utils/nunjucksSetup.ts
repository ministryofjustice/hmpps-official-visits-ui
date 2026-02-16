/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path'
import nunjucks from 'nunjucks'
import express from 'express'
import fs from 'fs'
import { flatten, groupBy, map } from 'lodash'
import {
  addRemoveLinks,
  convertToTitleCase,
  dateAtTime,
  firstNameSpaceLastName,
  formatAddressLines,
  formatDate,
  formatOverEighteen,
  getTimeDiff,
  initialiseName,
  isDateAndInThePast,
  lastNameCommaFirstName,
  parseDate,
  timeStringTo12HourPretty,
  toDuration,
} from './utils'
import restrictionTagColour from './restrictionTagColour'
import { FieldValidationError } from '../middleware/setUpFlash'
import config from '../config'
import logger from '../../logger'
import { ReferenceDataItem } from '../@types/officialVisitsApi/types'
import { hasPermissionFilter } from '../middleware/requirePermissions'
import { Permission } from '../interfaces/hmppsUser'

export default function nunjucksSetup(app: express.Express): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'Manage Official Visits'
  app.locals.environmentName = config.environmentName
  app.locals.environmentNameColour = config.environmentName === 'PRE-PRODUCTION' ? 'govuk-tag--green' : ''
  app.locals.digitalPrisonServicesUrl = config.serviceUrls.digitalPrison
  app.locals.prisonerProfileUrl = config.serviceUrls.prisonerProfile
  app.locals.authUrl = config.apis.hmppsAuth.externalUrl
  app.locals.PERMISSION = Permission

  app.use((_req, res, next) => {
    res.locals.digitalPrisonServicesUrl = config.serviceUrls.digitalPrison
    res.locals.prisonerContactsUrl = config.serviceUrls.prisonerContacts
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
  njkEnv.addFilter('isDateAndInThePast', isDateAndInThePast)
  njkEnv.addFilter('parseDate', parseDate)
  njkEnv.addGlobal('DPS_HOME_PAGE_URL', config.serviceUrls.digitalPrison)
  njkEnv.addGlobal('CONTACTS_HOME_PAGE_URL', config.serviceUrls.prisonerContacts)
  njkEnv.addFilter('formatDate', formatDate)
  njkEnv.addFilter('formatOverEighteen', formatOverEighteen)
  njkEnv.addFilter('formatAddressLines', ({ flat, property, street, area, postcode, noFixedAddress }) =>
    formatAddressLines(flat, property, street, area, postcode, noFixedAddress),
  )
  njkEnv.addFilter('dateAtTime', dateAtTime)
  njkEnv.addFilter('restrictionTagColour', restrictionTagColour)
  njkEnv.addFilter('selected', (items: any[], selected: string) =>
    items.map(o => ({ ...o, checked: o.value === selected })),
  )
  njkEnv.addFilter('includes', (items: any[], selected: string) => items.includes(selected))
  njkEnv.addFilter('possessiveComma', (name: string) => (name.endsWith('s') ? `${name}’` : `${name}’s`))
  njkEnv.addFilter('timeStringTo12HourPretty', timeStringTo12HourPretty)
  njkEnv.addFilter('durationText', (startTime: string, endTime: string) =>
    toDuration(getTimeDiff(startTime, endTime) / 60000),
  )
  njkEnv.addFilter('min', (a: number, b: number) => Math.min(a, b))
  njkEnv.addFilter('max', (a: number, b: number) => Math.max(a, b))
  njkEnv.addFilter('setSelected', (items: any[], selected: string | string[]) =>
    items.map(o => ({ ...o, selected: o.value === selected[0] })),
  )
  njkEnv.addFilter('addSelectValue', (items: any[], value: string, text: string) =>
    items.concat([{ value, text, selected: false }]),
  )
  njkEnv.addFilter('mojDate', (date: string) => date?.split('-').reverse().join('/'))
  njkEnv.addFilter('lastNameCommaFirstName', lastNameCommaFirstName)
  njkEnv.addFilter('firstNameSpaceLastName', firstNameSpaceLastName)
  njkEnv.addFilter('filterCategoryItems', (items: { value: string }[], values: string[]) =>
    items.filter(o => values.includes(o.value)),
  )
  njkEnv.addFilter('addRemoveLinks', addRemoveLinks)
  njkEnv.addFilter('refDataToOptions', (items: ReferenceDataItem[]) =>
    items.map((item: ReferenceDataItem) => ({ value: item.code, text: item.description })),
  )
  njkEnv.addFilter('includes', <T>(arr: T[], item: T) => arr.includes(item))
  njkEnv.addFilter('hasPermission', hasPermissionFilter)
  njkEnv.addFilter('filterNonFalsy', (items: any[]) => items.filter(item => item))
  njkEnv.addFilter(
    'toVisitorNameAndRelationship',
    (visitors: { firstName: string; lastName: string; relationshipDescription: string }[], seperator: string = '\n') =>
      visitors
        .map(visitor => `${firstNameSpaceLastName(visitor)} (${visitor.relationshipDescription})`)
        .join(seperator),
  )
}
