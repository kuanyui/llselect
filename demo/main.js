import { LLSelectSingle, LLSELECT_VERSION } from '../dist/index.mjs'
import { COUNTRIES, USERS, STRESS_ITEMS } from './data.js'

console.log('llselect v' + LLSELECT_VERSION)

// 1.1 Strings
const outCountries = document.getElementById('out-countries')
const selCountries = new LLSelectSingle(
  document.getElementById('mount-countries'),
  {
    placeholder: 'Pick a country',
    onChange: (v) => { outCountries.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selCountries.setOptions(COUNTRIES)

// 1.2 Objects with custom template + compareFn
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

// 1.3 Stress test (200 options)
const outStress = document.getElementById('out-stress')
const selStress = new LLSelectSingle(
  document.getElementById('mount-stress'),
  {
    placeholder: 'Pick an item (200 entries)',
    onChange: (v) => { outStress.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selStress.setOptions(STRESS_ITEMS)

// 2.1 Scrollable container
const outScroll = document.getElementById('out-scroll')
const selScroll = new LLSelectSingle(
  document.getElementById('mount-scroll'),
  {
    placeholder: 'Pick a country (in scroll container)',
    onChange: (v) => { outScroll.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selScroll.setOptions(COUNTRIES)

// 3.1 Outside-click pass-through
let passCount = 0
const btnPass = document.getElementById('btn-pass')
btnPass.addEventListener('click', () => {
  passCount++
  btnPass.textContent = `Outside button (clicks: ${passCount})`
})
const selPass = new LLSelectSingle(
  document.getElementById('mount-pass'),
  { placeholder: 'pass-through select' }  // default behavior
)
selPass.setOptions(COUNTRIES)

// 3.2 Outside-click block
let blockCount = 0
const btnBlock = document.getElementById('btn-block')
btnBlock.addEventListener('click', () => {
  blockCount++
  btnBlock.textContent = `Outside button (clicks: ${blockCount})`
})
const selBlock = new LLSelectSingle(
  document.getElementById('mount-block'),
  {
    placeholder: 'block select',
    outsideClickBehavior: 'block',
  }
)
selBlock.setOptions(COUNTRIES)

// 4. Near page bottom (flip up)
const outBottom = document.getElementById('out-bottom')
const selBottom = new LLSelectSingle(
  document.getElementById('mount-bottom'),
  {
    placeholder: 'Pick a country (near page bottom)',
    onChange: (v) => { outBottom.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selBottom.setOptions(COUNTRIES)
