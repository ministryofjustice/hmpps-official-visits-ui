context('Healthcheck', () => {
  context('All healthy', () => {
    beforeEach(() => {
      cy.task('reset')
      cy.task('stubComponents')
      cy.task('stubAuthPing')
      cy.task('stubTokenVerificationPing')
      cy.task('stubLocationsInPrisonApiPing')
      cy.task('stubPrisonerSearchApiPing')
      cy.task('stubOfficialVisitsApiPing')
    })

    it('Health check page is visible and UP', () => {
      cy.request('/health').its('body.status').should('equal', 'UP')
    })

    it('Ping is visible and UP', () => {
      cy.request('/ping').its('body.status').should('equal', 'UP')
    })

    it('Info is visible', () => {
      cy.request('/info').its('body').should('exist')
    })
  })

  context('Some unhealthy', () => {
    beforeEach(() => {
      cy.task('reset')
      cy.task('stubComponents')
      cy.task('stubAuthPing')
      cy.task('stubTokenVerificationPing', 500)
      cy.task('stubLocationsInPrisonApiPing')
      cy.task('stubPrisonerSearchApiPing')
      cy.task('stubOfficialVisitsApiPing')
      cy.task('stubPrisonApiPing')
    })

    it('Reports correctly when token verification down', () => {
      cy.request({ url: '/health', method: 'GET', failOnStatusCode: false }).then(response => {
        expect(response.body.components.hmppsAuth.status).to.equal('UP')
        expect(response.body.components.locationsInsidePrisonApi.status).to.equal('UP')
        expect(response.body.components.prisonerSearchApi.status).to.equal('UP')
        expect(response.body.components.officialVisitsApi.status).to.equal('UP')
        expect(response.body.components.tokenVerification.status).to.equal('DOWN')
        expect(response.body.components.tokenVerification.details).to.contain({ status: 500, attempts: 3 })
      })
    })

    it('Health check page is visible and DOWN', () => {
      cy.request({ url: '/health', method: 'GET', failOnStatusCode: false }).its('body.status').should('equal', 'DOWN')
    })
  })
})
