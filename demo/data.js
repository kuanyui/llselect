// Demo datasets. None of this is shipped with the library.

export const COUNTRIES = [
  'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil',
  'Bulgaria', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia',
  'Czech Republic', 'Denmark', 'Egypt', 'Estonia', 'Ethiopia', 'Finland',
  'France', 'Germany', 'Ghana', 'Greece', 'Hungary', 'Iceland', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Latvia', 'Lithuania', 'Malaysia',
  'Mexico', 'Mongolia', 'Morocco', 'Nepal', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Romania', 'Russia', 'Saudi Arabia', 'Serbia', 'Singapore',
  'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain',
  'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Turkey',
  'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Uruguay', 'Venezuela', 'Vietnam',
]

const FIRST_NAMES = [
  'Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Hank',
  'Iris', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter',
  'Quinn', 'Rachel', 'Sam', 'Tina', 'Umar', 'Vera', 'Walter', 'Xena',
  'Yuki', 'Zara',
]

const LAST_NAMES = [
  'Anderson', 'Brown', 'Chen', 'Davis', 'Evans', 'Foster', 'Garcia',
  'Huang', 'Ito', 'Johnson', 'Kim', 'Lee', 'Martinez', 'Nakamura',
  'Okafor', 'Patel', 'Rossi', 'Singh', 'Tanaka', 'Wang',
]

export const USERS = Array.from({ length: 40 }, (_, i) => {
  const first = FIRST_NAMES[i % FIRST_NAMES.length]
  const last = LAST_NAMES[(i * 3) % LAST_NAMES.length]
  return { id: 1000 + i, name: `${first} ${last}`, role: i % 4 === 0 ? 'admin' : 'user' }
})

export const STRESS_ITEMS = Array.from({ length: 200 }, (_, i) => {
  return `Item ${String(i + 1).padStart(3, '0')}`
})

export const HUGE_ITEMS = Array.from({ length: 10000 }, (_, i) => {
  return `Row ${String(i + 1).padStart(5, '0')}`
})

// Mixed short / very long labels for the width-policy demos (section 6).
// [0] is intentionally absurdly long so the default-chosen entry overflows
// the constrained trigger and forces ellipsis to be visible without any
// manual interaction. Enough total entries that the popup gets a visible
// vertical scrollbar in the default theme.
export const LONG_NAMES = [
  'A really really really really long sentence that absolutely will not fit in any reasonably-sized trigger box, no matter how wide your monitor happens to be today',
  'Japan',
  'United Kingdom of Great Britain and Northern Ireland',
  'France',
  'Federative Republic of Brazil',
  'Switzerland',
  'United States of America',
  'Czech Republic (officially Czechia since 2016)',
  'Democratic Republic of the Congo',
  'Argentine Republic',
  'Bolivarian Republic of Venezuela',
  'Eastern Republic of Uruguay',
  'Hellenic Republic',
  'Independent State of Papua New Guinea',
  'Italian Republic',
  'Kingdom of Saudi Arabia',
  'Plurinational State of Bolivia',
  'Republic of South Africa',
  'Saint Vincent and the Grenadines',
  'Trinidad and Tobago',
]

// Object items for the rich item-content demos (section 10): each carries an
// mdi icon name, a display name, and a brand color for the icon.
export const PROGRAMMING_LANGUAGES = [
  { name: 'JavaScript', icon: 'language-javascript', color: '#f7df1e' },
  { name: 'TypeScript', icon: 'language-typescript', color: '#3178c6' },
  { name: 'Python', icon: 'language-python', color: '#3776ab' },
  { name: 'Rust', icon: 'language-rust', color: '#ce412b' },
  { name: 'Go', icon: 'language-go', color: '#00add8' },
  { name: 'Ruby', icon: 'language-ruby', color: '#cc342d' },
  { name: 'Java', icon: 'language-java', color: '#e76f00' },
  { name: 'C++', icon: 'language-cpp', color: '#00599c' },
  { name: 'C#', icon: 'language-csharp', color: '#239120' },
  { name: 'PHP', icon: 'language-php', color: '#777bb4' },
  { name: 'Swift', icon: 'language-swift', color: '#fa7343' },
  { name: 'Kotlin', icon: 'language-kotlin', color: '#7f52ff' },
]
