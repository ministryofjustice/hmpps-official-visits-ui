import express, { Router } from 'express'

export type FieldValidationError = {
  fieldId: string
  href: string
  text: string
}

export default function setUpFlash(): Router {
  const router = express.Router()

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

  router.use((req, res, next) => {
    if (req.method === 'GET') {
      const successMessageFlash = req.flash('successMessage') ? req.flash('successMessage')[0] : undefined
      const validationErrorsFlash = req.flash('validationErrors') ? req.flash('validationErrors')[0] : undefined
      const formResponsesFlash = req.flash('formResponses') ? req.flash('formResponses')[0] : undefined

      res.locals.successMessage = successMessageFlash ? JSON.parse(successMessageFlash) : null
      res.locals.validationErrors = validationErrorsFlash ? JSON.parse(validationErrorsFlash) : null
      res.locals.formResponses = formResponsesFlash ? JSON.parse(formResponsesFlash) : null
    }

    next()
  })

  return router
}
