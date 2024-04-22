// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
describe('CurrentShows Page', () => {
    it('should load the page successfully', () => {
      cy.visit('http://localhost:3000/currentshows')
      cy.title().should('eq', 'Current Show "Trad Medium" at ZXY Gallery in Bushwick')
    })
  
    it('should display the correct heading', () => {
      cy.get('h1').contains('ZXY Gallery presents "Trad Medium"')
    })
  
    it('should display the correct image', () => {
      cy.get('img').should('have.attr', 'src', '/tradmedium.jpeg')
    })
  
    it('should navigate to the home page when the link is clicked', () => {
      cy.get('a[href="/"]').click()
      cy.url().should('eq', 'http://localhost:3000/')
    })
  
    it('should navigate to the Instagram page when the link is clicked', () => {
      cy.get('a[href="https://www.instagram.com/zxygallery/"]').click()
      cy.url().should('eq', 'https://www.instagram.com/zxygallery/')
    })
  })
  