import { LLSelectSingle, LLSELECT_VERSION } from '../dist/index.mjs'
import { COUNTRIES, USERS, STRESS_ITEMS } from './data.js'

console.log('llselect v' + LLSELECT_VERSION)

// 1) Countries near top of the page (normal positioning).
const outCountries = document.getElementById('out-countries')
const selCountries = new LLSelectSingle(
  document.getElementById('mount-countries'),
  {
    placeholder: 'Pick a country',
    onChange: (v) => { outCountries.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selCountries.setOptions(COUNTRIES)

// 2) Users with custom template + compareFn.
const outUsers = document.getElementById('out-users')
class UserSelect extends LLSelectSingle {
  templateOption(user) { return `#${user.id} ${user.name} (${user.role})` }
}
const selUsers = new UserSelect(
  document.getElementById('mount-users'),
  {
    placeholder: 'Pick a user',
    compareFn: (a, b) => a.id === b.id,
    onChange: (v) => { outUsers.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selUsers.setOptions(USERS)

// 3) Stress test (200 items) for scroll behavior inside listbox.
const outStress = document.getElementById('out-stress')
const selStress = new LLSelectSingle(
  document.getElementById('mount-stress'),
  {
    placeholder: 'Pick an item (200 entries)',
    onChange: (v) => { outStress.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selStress.setOptions(STRESS_ITEMS)

// 4) Select near bottom of viewport - exercises flip-up logic (phase 4).
const outBottom = document.getElementById('out-bottom')
const selBottom = new LLSelectSingle(
  document.getElementById('mount-bottom'),
  {
    placeholder: 'Pick a country (near page bottom)',
    onChange: (v) => { outBottom.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selBottom.setOptions(COUNTRIES)

// 5) Select inside a scrollable container - exercises scroll repositioning (phase 4).
const outScroll = document.getElementById('out-scroll')
const selScroll = new LLSelectSingle(
  document.getElementById('mount-scroll'),
  {
    placeholder: 'Pick a country (inside scroll container)',
    onChange: (v) => { outScroll.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selScroll.setOptions(COUNTRIES)
