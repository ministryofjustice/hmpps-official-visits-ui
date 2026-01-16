import * as govukFrontend from 'govuk-frontend'
import * as mojFrontend from '@ministryofjustice/frontend'
import Card from './card'
import { nodeListForEach } from './utils'

govukFrontend.initAll()
mojFrontend.initAll()
window.MojFrontend = mojFrontend

var $cards = document.querySelectorAll('.card--clickable')
nodeListForEach($cards, function ($card) {
  new Card($card)
})
