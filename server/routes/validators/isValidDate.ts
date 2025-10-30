import { registerDecorator, ValidationOptions } from 'class-validator'
import { isValid } from 'date-fns'

export default function IsValidDate(validationOptions: ValidationOptions) {
  return (object: unknown, propertyName: string) => {
    registerDecorator({
      name: 'IsValidDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: dataToValidate => isValid(dataToValidate) && dataToValidate > new Date().setFullYear(1000, 1, 1),
      },
    })
  }
}
