import { z } from 'zod'
import { isValid, parseISO, startOfDay, isBefore } from 'date-fns'

/**
 * Validator for dates from the mojDatePicker component (or similar that outputs in a DD-MM-YYYY string)
 * @param invalidDateErrorMsg Error message to display if the date is not a parsable date
 * @returns The date formatted as YYYY-MM-DD
 */
export const validateDateOptional = (invalidDateErrorMsg: string) => {
  return z.optional(
    z
      .string()
      .transform(transformDate)
      .check(ctx => checkValidDate(ctx, invalidDateErrorMsg)),
  )
}

const transformDate = (value: string) => {
  const reversed = value.split(/[-/]/).reverse()
  // Prefix month and date with a 0 if needed
  const year = reversed[0]?.length === 4 ? reversed[0] : reversed[2]
  const month = reversed[1].padStart(2, '0')
  const date = reversed[0]?.length === 4 ? reversed[2] : reversed[0].padStart(2, '0')
  return parseISO(`${year}-${month}-${date}T00:00:00Z`) // We put a full timestamp on it so it gets parsed as UTC time and the date doesn't get changed due to locale
}

const checkValidDate = (ctx: z.core.ParsePayload<Date>, invalidDateErrorMsg: string) => {
  if (!isValid(ctx.value)) {
    ctx.issues.push({ code: 'custom', message: invalidDateErrorMsg, input: ctx.value })
  }
}

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
    .transform(transformDate)
    .check(ctx => checkValidDate(ctx, invalidDateErrorMsg))
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
