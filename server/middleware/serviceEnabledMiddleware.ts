import { RequestHandler } from 'express'
import { prisonEnabled } from '../utils/utils'

export default function serviceEnabledMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (!prisonEnabled(res.locals.user.activeCaseLoadId)) {
      return res.render('pages/notEnabled', {
        user: res.locals.user,
        serviceName: 'Official Visits',
        prisonName: res.locals.user.activeCaseLoad.description.match(/^([^(]*)/)[1].trim(),
      })
    }

    return next()
  }
}
