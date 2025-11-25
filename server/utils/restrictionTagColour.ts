const restrictionTagColour = (restrictionType: string): string => {
  let tagClass: string
  switch (restrictionType) {
    case 'ACC': {
      tagClass = 'govuk-tag--turquoise'
      break
    }
    case 'BAN': {
      tagClass = 'govuk-tag--red'
      break
    }
    case 'CCTV': {
      tagClass = 'govuk-tag--yellow'
      break
    }
    case 'CHILD': {
      tagClass = 'govuk-tag--grey'
      break
    }
    case 'CLOSED': {
      tagClass = 'govuk-tag--purple'
      break
    }
    case 'DIHCON': {
      tagClass = 'govuk-tag--blue'
      break
    }
    case 'NONCON': {
      tagClass = 'govuk-tag--green'
      break
    }
    case 'PREINF': {
      tagClass = 'govuk-tag--orange'
      break
    }
    case 'RESTRICTED': {
      tagClass = 'govuk-tag--pink'
      break
    }
    default: {
      tagClass = 'govuk-tag--grey'
      break
    }
  }

  return tagClass
}

export default restrictionTagColour
