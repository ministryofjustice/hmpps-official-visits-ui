import alertTags from './alertTags'

const activeAlert = (alertType: string, alertCode: string) => ({ alertType, alertCode, active: true, expired: false })

describe('alertTags', () => {
  it.each([
    ['MFL', 'False Limbs', 'alert-tag--medical'],
    ['MHT', 'Hearing Impaired', 'alert-tag--medical'],
    ['MSI', 'Sight Impaired', 'alert-tag--medical'],
    ['MSP', 'Speech Impediment', 'alert-tag--medical'],
    ['PEEP', 'Personal Emergency Evacuation Plan', 'alert-tag--medical'],
    ['OHCO', 'Harassment Offences/Court orders', 'alert-tag--other'],
    ['RCDR', 'Quarantined - Communicable Disease Risk', 'alert-tag--risk'],
    ['RCON', 'Conflict with other prisoners', 'alert-tag--risk'],
    ['RDV', 'Domestic Violence Perpetrator', 'alert-tag--risk'],
    ['RKC', 'Risk to Known Adult - Community', 'alert-tag--risk'],
    ['RKS', 'Risk to Known Adult - Custody', 'alert-tag--risk'],
    ['RSP', 'Stalking Perpetrator', 'alert-tag--risk'],
    ['RNO121', 'No 1 to 1s with this prisoner', 'alert-tag--risk'],
    ['RPB', 'Risk to Public - Community', 'alert-tag--risk'],
    ['RPC', 'Risk to Public - Custody', 'alert-tag--risk'],
    ['RSS', 'Risk to Staff - Custody', 'alert-tag--risk'],
    ['RST', 'Risk to Staff - Community', 'alert-tag--risk'],
    ['SO', 'Sexual Offence Not on Sex Offender Reg', 'alert-tag--sexual-offence'],
    ['SONR', 'Sex offender not required to register', 'alert-tag--sexual-offence'],
    ['SOR', 'Registered sex offender', 'alert-tag--sexual-offence'],
    ['SR', 'On Sex Offender Register', 'alert-tag--sexual-offence'],
    ['SSHO', 'RSHO or SRO', 'alert-tag--sexual-offence'],
    ['V45', 'Rule 45 - GOOD', 'alert-tag--vulnerability'],
    ['V46', 'Rule 46 - GOOD', 'alert-tag--vulnerability'],
    ['VJOP', 'Rule 46 - Own Protection', 'alert-tag--vulnerability'],
    ['VOP', 'Rule 45 - Own Protection', 'alert-tag--vulnerability'],
    ['XRF', 'Risk to Females', 'alert-tag--security'],
    ['XSO', 'Sex Offender', 'alert-tag--security'],
    ['XECV', 'Enhanced Contact Vetting (ECV)', 'alert-tag--security'],
    ['XCCI', 'Cyber Capable Individual', 'alert-tag--security'],
    ['XIT', 'No access to IT', 'alert-tag--security'],
    ['SA', 'Staff Assaulter', 'alert-tag--security'],
  ])('should describe and colour the %s alert', (alertCode, description, classes) => {
    expect(alertTags([activeAlert(alertCode.charAt(0), alertCode)])).toEqual([{ alertCode, description, classes }])
  })

  it('should not show alerts that are not in the list of relevant alerts', () => {
    const alerts = [activeAlert('H', 'HA'), activeAlert('R', 'RCON'), activeAlert('X', 'XA')]

    expect(alertTags(alerts)).toEqual([
      { alertCode: 'RCON', description: 'Conflict with other prisoners', classes: 'alert-tag--risk' },
    ])
  })

  it('should not show inactive alerts', () => {
    const alerts = [{ alertType: 'R', alertCode: 'RCON', active: false, expired: true }, activeAlert('X', 'XRF')]

    expect(alertTags(alerts)).toEqual([
      { alertCode: 'XRF', description: 'Risk to Females', classes: 'alert-tag--security' },
    ])
  })

  it('should keep the order the alerts were given in', () => {
    const alerts = [activeAlert('X', 'XRF'), activeAlert('M', 'PEEP'), activeAlert('R', 'RCON')]

    expect(alertTags(alerts).map(alert => alert.alertCode)).toEqual(['XRF', 'PEEP', 'RCON'])
  })

  it.each([
    ['no alerts', [] as { alertCode: string }[]],
    ['undefined alerts', undefined],
  ])('should return an empty list for %s', (_, alerts) => {
    expect(alertTags(alerts)).toEqual([])
  })
})
