import restrictionTagColour from './restrictionTagColour'

describe('restrictionTagColour', () => {
  it.each([
    ['ACC', 'govuk-tag--turquoise'],
    ['BAN', 'govuk-tag--red'],
    ['CCTV', 'govuk-tag--yellow'],
    ['CHILD', 'govuk-tag--grey'],
    ['CLOSED', 'govuk-tag--purple'],
    ['DIHCON', 'govuk-tag--blue'],
    ['NONCON', 'govuk-tag--green'],
    ['PREINF', 'govuk-tag--orange'],
    ['RESTRICTED', 'govuk-tag--pink'],
    ['FOO', 'govuk-tag--grey'], // default to grey
  ])(
    'should return the restriction type description with "(expired)" if the expiry date is in the past',
    (type, expectedClass) => {
      const result = restrictionTagColour(type)
      expect(result).toStrictEqual(expectedClass)
    },
  )
})
