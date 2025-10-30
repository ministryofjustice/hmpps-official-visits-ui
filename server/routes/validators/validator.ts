import { registerDecorator, ValidationOptions } from 'class-validator'

export default function Validator(
  /* eslint-disable @typescript-eslint/no-explicit-any */
  evaluationMethod: (dataToValidate: any, validationObject: any) => boolean,
  validationOptions: ValidationOptions,
) {
  return (object: unknown, propertyName: string) => {
    registerDecorator({
      name: 'Validator',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (dataToValidate, args) => evaluationMethod(dataToValidate, args.object),
      },
    })
  }
}
