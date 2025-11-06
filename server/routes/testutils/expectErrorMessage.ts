import { flashProvider } from './appSetup'

export function expectErrorMessages(errorMessages: Record<string, string[]>) {
  expect(flashProvider).toHaveBeenNthCalledWith(1, 'validationErrors', JSON.stringify(errorMessages))
}

export function expectNoErrorMessages() {
  expect(flashProvider).not.toHaveBeenCalled()
}
