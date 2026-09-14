import { PrisonerAlert } from '../@types/prisonerSearchApi/types'

type AlertCategory = 'medical' | 'other' | 'risk' | 'sexual-offence' | 'vulnerability' | 'security'

const RELEVANT_ALERTS: Record<string, { description: string; category: AlertCategory }> = {
  MFL: { description: 'False Limbs', category: 'medical' },
  MHT: { description: 'Hearing Impaired', category: 'medical' },
  MSI: { description: 'Sight Impaired', category: 'medical' },
  MSP: { description: 'Speech Impediment', category: 'medical' },
  PEEP: { description: 'Personal Emergency Evacuation Plan', category: 'medical' },
  OHCO: { description: 'Harassment Offences/Court orders', category: 'other' },
  RCDR: { description: 'Quarantined - Communicable Disease Risk', category: 'risk' },
  RCON: { description: 'Conflict with other prisoners', category: 'risk' },
  RDV: { description: 'Domestic Violence Perpetrator', category: 'risk' },
  RKC: { description: 'Risk to Known Adult - Community', category: 'risk' },
  RKS: { description: 'Risk to Known Adult - Custody', category: 'risk' },
  RSP: { description: 'Stalking Perpetrator', category: 'risk' },
  RNO121: { description: 'No 1 to 1s with this prisoner', category: 'risk' },
  RPB: { description: 'Risk to Public - Community', category: 'risk' },
  RPC: { description: 'Risk to Public - Custody', category: 'risk' },
  RSS: { description: 'Risk to Staff - Custody', category: 'risk' },
  RST: { description: 'Risk to Staff - Community', category: 'risk' },
  SO: { description: 'Sexual Offence Not on Sex Offender Reg', category: 'sexual-offence' },
  SONR: { description: 'Sex offender not required to register', category: 'sexual-offence' },
  SOR: { description: 'Registered sex offender', category: 'sexual-offence' },
  SR: { description: 'On Sex Offender Register', category: 'sexual-offence' },
  SSHO: { description: 'RSHO or SRO', category: 'sexual-offence' },
  V45: { description: 'Rule 45 - GOOD', category: 'vulnerability' },
  V46: { description: 'Rule 46 - GOOD', category: 'vulnerability' },
  VJOP: { description: 'Rule 46 - Own Protection', category: 'vulnerability' },
  VOP: { description: 'Rule 45 - Own Protection', category: 'vulnerability' },
  XRF: { description: 'Risk to Females', category: 'security' },
  XSO: { description: 'Sex Offender', category: 'security' },
  XECV: { description: 'Enhanced Contact Vetting (ECV)', category: 'security' },
  XCCI: { description: 'Cyber Capable Individual', category: 'security' },
  XIT: { description: 'No access to IT', category: 'security' },
  SA: { description: 'Staff Assaulter', category: 'security' },
}

export type AlertTag = {
  alertCode: string
  description: string
  classes: string
}

const alertTags = (alerts: PrisonerAlert[] = []): AlertTag[] =>
  alerts
    .filter(alert => alert.active && RELEVANT_ALERTS[alert.alertCode])
    .map(alert => ({
      alertCode: alert.alertCode,
      description: RELEVANT_ALERTS[alert.alertCode].description,
      classes: `alert-tag--${RELEVANT_ALERTS[alert.alertCode].category}`,
    }))

export default alertTags
