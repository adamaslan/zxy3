describe('CurrentShows Page', () => {
    it('should load the page successfully', () => {
      cy.visit('/posts/currentshows')
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
      cy.url().should('eq', '/')
    })
  
    it('should navigate to the Instagram page when the link is clicked', () => {
      cy.get('a[href="https://www.instagram.com/zxygallery/"]').click()
      cy.url().should('eq', 'https://www.instagram.com/zxygallery/')
    })
  })
  