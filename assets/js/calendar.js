const DAY_SELECTOR = '.hmpps-calendar__day-item'

const toDateKey = date =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')

class Calendar {
  constructor(container) {
    this.container = container
    this.days = Array.prototype.slice.call(container.querySelectorAll(DAY_SELECTOR))

    if (this.days.length === 0) return

    this.indexByDate = {}
    this.days.forEach((day, index) => {
      this.indexByDate[day.getAttribute('data-date')] = index
    })

    this.addKeyboardHint()
    this.setTabStop(this.entryIndex())

    this.container.addEventListener('keydown', this.onKeydown.bind(this))
    this.container.addEventListener('focusin', this.onFocusIn.bind(this))
  }

  entryIndex() {
    const selected = this.days.findIndex(day => day.hasAttribute('aria-current'))
    if (selected !== -1) return selected

    const firstBookable = this.days.findIndex(day => day.tagName === 'A')
    return firstBookable === -1 ? 0 : firstBookable
  }

  addKeyboardHint() {
    const hint = document.createElement('p')
    hint.className = 'govuk-visually-hidden'
    hint.textContent = 'Use the arrow keys to move between dates, then press Enter to choose one.'
    this.container.insertBefore(hint, this.container.firstChild)
  }

  setTabStop(index) {
    this.days.forEach((day, i) => {
      day.setAttribute('tabindex', i === index ? '0' : '-1')
    })
  }

  shiftByDays(index, offset) {
    const date = new Date(`${this.days[index].getAttribute('data-date')}T00:00:00`)
    date.setDate(date.getDate() + offset)

    const target = this.indexByDate[toDateKey(date)]
    return target === undefined ? -1 : target
  }

  onFocusIn(event) {
    const index = this.days.indexOf(event.target)
    if (index !== -1) this.setTabStop(index)
  }

  onKeydown(event) {
    const current = this.days.indexOf(event.target)
    if (current === -1) return

    let next
    switch (event.key) {
      case 'ArrowLeft':
        next = this.shiftByDays(current, -1)
        break
      case 'ArrowRight':
        next = this.shiftByDays(current, 1)
        break
      case 'ArrowUp':
        next = this.shiftByDays(current, -7)
        break
      case 'ArrowDown':
        next = this.shiftByDays(current, 7)
        break
      default:
        return
    }

    event.preventDefault()
    if (next === -1 || next === current) return

    this.setTabStop(next)
    this.days[next].focus()
  }
}

export default Calendar
