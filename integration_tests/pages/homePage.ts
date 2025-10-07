import Page, { PageElement } from './page'

export default class HomePage extends Page {
  constructor() {
    super('Official Visits')
  }

  headerUserName = (): PageElement => cy.get('[data-qa=header-user-name]')

  headerPhaseBanner = (): PageElement => cy.get('[data-qa=connect-dps-common-environment-tag]')
}
