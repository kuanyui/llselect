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
