import { z } from 'zod'
import { isValid, parseISO, startOfDay, isBefore } from 'date-fns'

/**
 * Validator for dates from the mojDatePicker component (or similar that outputs in a DD-MM-YYYY string)
 * @param missingDateErrorMsg Error message to display if the date is missing
 * @param invalidDateErrorMsg Error message to display if the date is not a parsable date
 * @returns The date formatted as YYYY-MM-DD
 */
export const validateDateBase = (missingDateErrorMsg: string, invalidDateErrorMsg: string) => {
  return z
    .string({ message: missingDateErrorMsg })
    .min(1, { message: missingDateErrorMsg })
    .transform(value => value.split(/[-/]/).reverse())
    .transform(value => {
      // Prefix month and date with a 0 if needed
      const month = value[1]?.length === 2 ? value[1] : `0${value[1]}`
      const date = value[2]?.length === 2 ? value[2] : `0${value[2]}`
      return `${value[0]}-${month}-${date}T00:00:00Z` // We put a full timestamp on it so it gets parsed as UTC time and the date doesn't get changed due to locale
    })
    .transform(date => parseISO(date))
    .check(ctx => {
      if (!isValid(ctx.value)) {
        ctx.issues.push({ code: 'custom', message: invalidDateErrorMsg, input: ctx.value })
      }
    })
}

type DateChecker = (date: Date) => boolean

/**
 * Convenience function for validating a date against an arbitrary date and transforming it to YYYY-MM-DD
 * @param checker Filter function for the parsed date
 * @param missingDateErrorMsg Error message to display if the date is missing
 * @param invalidDateErrorMsg Error message to display if the date is not a parsable date
 * @param checkFailErrorMsg Error message to display when the date fails the passed checker function
 * @returns
 */
export const validateTransformDate = (
  checker: DateChecker,
  missingDateErrorMsg: string,
  invalidDateErrorMsg: string,
  checkFailErrorMsg: string,
) => {
  return validateDateBase(missingDateErrorMsg, invalidDateErrorMsg)
    .check(ctx => {
      if (!checker(ctx.value)) {
        ctx.issues.push({ code: 'custom', message: checkFailErrorMsg, input: ctx.value })
      }
    })
    .transform(date => date.toISOString().substring(0, 10))
}

export const getMinDateChecker = (minDate: Date) => (date: Date) => !isBefore(startOfDay(date), startOfDay(minDate))

export const checkTodayOrFuture = getMinDateChecker(new Date())
