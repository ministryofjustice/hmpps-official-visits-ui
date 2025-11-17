import express, { Router } from 'express'

export const FLASH_KEY__VALIDATION_ERRORS = 'validationErrors'
export const FLASH_KEY__FORM_RESPONSES = 'formResponses'
export const FLASH_KEY__SUCCESS_MESSAGE = 'successMessage'

export type FieldValidationError = {
  fieldId: string
  href: string
  text: string
}

export default function setUpFlash(): Router {
  const router = express.Router()

  /**
   * This route adds functions onto the Request object to record validation errors encountered on POST requests.
   * These are recorded into flash as a list of validationErrors which the next GET request reads from flash.
   */

  router.use((req, res, next) => {
    const validationErrors: FieldValidationError[] = []

    res.addValidationError = (message: string, field?: string): void => {
      validationErrors.push({ fieldId: field, href: `#${field || ''}`, text: message })
    }

    res.validationFailed = (message?: string, field?: string): void => {
      if (message) {
        res.addValidationError(message, field)
      }
      req.flash('validationErrors', JSON.stringify(validationErrors))
      req.flash('formResponses', JSON.stringify(req.rawBody))
      res.redirect(req.get('Referrer') || '/')
    }

    res.addSuccessMessage = (heading: string, message?: string) => {
      req.flash('successMessage', JSON.stringify({ heading, message }))
    }

    next()
  })

  /**
   * For GET requests only, this route reads any values store in flash, which could be validation errors,
   * form responses or success banner messages, and makes them available as res.locals values. As soon
   * as flash messages are read, they are automatically removed - so only available once.
   */

  router.use((req, res, next) => {
    if (req.method === 'GET') {
      const successMessageFlash = req.flash('successMessage')[0]
      const validationErrorsFlash = req.flash('validationErrors')[0]
      const formResponsesFlash = req.flash('formResponses')[0]

      res.locals.successMessage = successMessageFlash ? JSON.parse(successMessageFlash) : null
      res.locals.validationErrors = validationErrorsFlash ? JSON.parse(validationErrorsFlash) : null
      res.locals.formResponses = formResponsesFlash ? JSON.parse(formResponsesFlash) : null
    }

    next()
  })

  return router
}
