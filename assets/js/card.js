function Card(container) {
  this.container = container

  if (this.container.querySelector('a') !== null) {
    this.container.addEventListener('click', () => {
      this.container.querySelector('a').click()
    })
  }
}

export default Card
