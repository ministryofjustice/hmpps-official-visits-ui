import { RequestHandler } from 'express'
import { FLASH_KEY__FORM_RESPONSES, FLASH_KEY__SUCCESS_MESSAGE, FLASH_KEY__VALIDATION_ERRORS } from '../utils/constants'

export default function setUpFlash(): RequestHandler {
  return async (req, res, next) => {
    res.addSuccessMessage = (heading: string, message?: string) => {
      req.flash(FLASH_KEY__SUCCESS_MESSAGE, JSON.stringify({ heading, message }))
    }

    if (req.method !== 'GET') {
      return next()
    }

    const validationErrors = req.flash(FLASH_KEY__VALIDATION_ERRORS)[0]
    const formResponses = req.flash(FLASH_KEY__FORM_RESPONSES)[0]
    if (validationErrors) {
      res.locals['validationErrors'] = JSON.parse(validationErrors)
    }
    if (formResponses) {
      res.locals.formResponses = JSON.parse(formResponses)
    }

    return next()
  }
}
