import { LLSelectSingle, LLSELECT_VERSION } from '../dist/index.mjs'

console.log('llselect v' + LLSELECT_VERSION)

// String options.
const outStrings = document.getElementById('out-strings')
const selA = new LLSelectSingle(
  document.getElementById('mount-strings'),
  {
    placeholder: 'Pick a fruit',
    onChange: (v) => { outStrings.textContent = 'chosen: ' + JSON.stringify(v) }
  }
)
selA.setOptions(['Apple', 'Banana', 'Cherry', 'Durian', 'Elderberry'])

// Object options with custom template + compareFn.
const outObjects = document.getElementById('out-objects')
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Carol' },
]

class UserSelect extends LLSelectSingle {
  templateOption(user) { return `#${user.id} ${user.name}` }
}

const selB = new UserSelect(
  document.getElementById('mount-objects'),
  {
    placeholder: 'Pick a user',
    compareFn: (a, b) => a.id === b.id,
    onChange: (v) => { outObjects.textContent = 'chosen: ' + JSON.stringify(v) }
  }
)
selB.setOptions(users)
