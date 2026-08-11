// Shared interactive TOC for the two examples pages (core and AngularJS).
// Wide screens: sticky left sidebar with scrollspy + text filter. Below 62rem
// (the site pages' sidebar breakpoint): an off-canvas left drawer behind a
// fixed "Sections" button. Everything is injected at runtime, so without JS
// the pages keep their plain single-column layout (.page-layout only becomes
// a grid once .has-toc is added here).

const layout = document.querySelector('.page-layout')
const mainEl = layout ? layout.querySelector('main') : null

if (layout && mainEl) {
  // --- collect entries: one per <section> h2, its h3s nested ---------------
  // Same slug scheme as scripts/build-site.mjs, deduped in document order.
  const slugCounts = new Map()
  const slugify = (text) => {
    let id = text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const n = slugCounts.get(id) ?? 0
    slugCounts.set(id, n + 1)
    if (n > 0) { id = `${id}-${n}` }
    return id
  }
  const tree = document.createElement('ul')
  tree.className = 'toc-tree'
  const targets = [] // [anchor element, toc link] in document order (scrollspy)
  const addLink = (parentUl, el, text, isSection) => {
    const li = document.createElement('li')
    if (isSection) { li.className = 'toc-section' }
    const a = document.createElement('a')
    a.href = `#${el.id}`
    a.textContent = text
    li.appendChild(a)
    parentUl.appendChild(li)
    targets.push([el, a])
    return li
  }
  for (const sec of mainEl.querySelectorAll('section')) {
    const h2 = sec.querySelector('h2')
    if (!h2) { continue }
    sec.id = slugify(h2.textContent)
    const li = addLink(tree, sec, h2.textContent, true)
    const h3s = [...sec.querySelectorAll('h3')]
    if (h3s.length > 0) {
      const ul = document.createElement('ul')
      for (const h3 of h3s) {
        h3.id = slugify(h3.textContent)
        addLink(ul, h3, h3.textContent, false)
      }
      li.appendChild(ul)
    }
  }

  // --- sidebar shell -------------------------------------------------------
  const aside = document.createElement('aside')
  aside.id = 'toc'
  aside.className = 'toc'
  aside.tabIndex = -1 // focus target when the drawer opens
  aside.setAttribute('aria-label', 'Table of contents')
  const filter = document.createElement('input')
  filter.type = 'search'
  filter.placeholder = 'Filter'
  filter.setAttribute('aria-label', 'Filter the table of contents')
  aside.append(filter, tree)
  layout.classList.add('has-toc')
  layout.insertBefore(aside, mainEl)
  // The core page's sticky theme bar owns the top edge; stick below it.
  const bar = document.querySelector('.theme-picker')
  if (bar) { aside.style.setProperty('--toc-top', `${bar.offsetHeight + 12}px`) }

  const drawerMq = window.matchMedia('(max-width: 62rem)')
  const isOpen = () => document.body.classList.contains('toc-open')

  // --- scrollspy -----------------------------------------------------------
  let activeLink = null
  const sync = () => {
    const y = window.scrollY + 120
    let cur = null
    for (const [el, link] of targets) { if (el.offsetTop <= y) { cur = link } else { break } }
    if (cur === activeLink) { return }
    if (activeLink) { activeLink.classList.remove('active') }
    activeLink = cur
    if (activeLink) {
      activeLink.classList.add('active')
      // keep the highlight visible inside the sidebar's own overflow; skip
      // while the drawer sits closed off-screen
      if (!drawerMq.matches || isOpen()) { activeLink.scrollIntoView({ block: 'nearest' }) }
    }
  }
  window.addEventListener('scroll', () => { window.requestAnimationFrame(sync) }, { passive: true })
  sync()

  // --- text filter ---------------------------------------------------------
  // A section li's textContent includes its children, so a child match keeps
  // its section visible (same behavior as the site sidebar).
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase()
    for (const li of tree.querySelectorAll('li')) {
      li.hidden = q !== '' && !li.textContent.toLowerCase().includes(q)
    }
  })

  // --- mobile drawer chrome ------------------------------------------------
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'toc-toggle'
  toggle.setAttribute('aria-controls', 'toc')
  toggle.setAttribute('aria-expanded', 'false')
  // mdi table-of-contents (MIT), same source as the site's other icons
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3,9H17V7H3V9M3,13H17V11H3V13M3,17H17V15H3V17M19,17H21V15H19V17M19,7V9H21V7H19M19,13H21V11H19V13Z"/></svg>Sections'
  const backdrop = document.createElement('div')
  backdrop.className = 'toc-backdrop'
  backdrop.hidden = true
  document.body.append(toggle, backdrop)
  const openDrawer = () => {
    document.body.classList.add('toc-open')
    backdrop.hidden = false
    toggle.setAttribute('aria-expanded', 'true')
    if (activeLink) { activeLink.scrollIntoView({ block: 'nearest' }) }
    aside.focus({ preventScroll: true })
  }
  const closeDrawer = (refocusToggle) => {
    document.body.classList.remove('toc-open')
    backdrop.hidden = true
    toggle.setAttribute('aria-expanded', 'false')
    if (refocusToggle) { toggle.focus() }
  }
  toggle.addEventListener('click', () => { if (isOpen()) { closeDrawer(true) } else { openDrawer() } })
  backdrop.addEventListener('click', () => { closeDrawer(false) })
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && isOpen()) { closeDrawer(true) }
  })
  tree.addEventListener('click', (ev) => {
    if (ev.target.closest('a') && drawerMq.matches) { closeDrawer(false) }
  })
  // Widening past the breakpoint while open would leave body scroll locked.
  drawerMq.addEventListener('change', () => { closeDrawer(false) })

  // --- initial fragment ----------------------------------------------------
  // ids exist only after this script runs, so the browser's own load-time
  // fragment scroll found nothing; redo it.
  if (location.hash.length > 1) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (target) { target.scrollIntoView() }
  }
}
