import { flashProvider } from './appSetup'
import { FieldValidationError } from '../../middleware/setUpFlash'

export function expectErrorMessages(errorMessages: FieldValidationError[], nth: number = 1) {
  expect(flashProvider).toHaveBeenNthCalledWith(nth, 'validationErrors', JSON.stringify(errorMessages))
}

export function expectNoErrorMessages() {
  // Redirect check answers middleware checks flash contents only
  expect(flashProvider).toHaveBeenCalledTimes(1)
  expect(flashProvider).toHaveBeenNthCalledWith(1, 'validationErrors')
}
