// Shared interactive TOC for the two examples pages (core and AngularJS).
// Wide screens: sticky left sidebar with scrollspy + text filter; the content
// block owning the active heading is painted in step (.current-block). Below 62rem
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
  const linkTexts = new Map() // toc link -> its plain text (filter re-renders it with <mark>s)
  const addLink = (parentUl, el, text, isSection) => {
    const li = document.createElement('li')
    if (isSection) { li.className = 'toc-section' }
    const a = document.createElement('a')
    a.href = `#${el.id}`
    a.textContent = text
    linkTexts.set(a, text)
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

  // --- sidebar container ---------------------------------------------------
  const aside = document.createElement('aside')
  aside.id = 'toc'
  aside.className = 'toc'
  aside.tabIndex = -1 // focus target when the drawer opens
  aside.setAttribute('aria-label', 'Table of contents')
  const filter = document.createElement('input')
  filter.type = 'search'
  filter.placeholder = 'Filter'
  filter.setAttribute('aria-label', 'Filter the table of contents')
  // Pinned toolbar over the only scroller: the filter stays put, the tree
  // scrolls beneath it.
  const toolbar = document.createElement('div')
  toolbar.className = 'toc-bar'
  toolbar.append(filter)
  const scrollArea = document.createElement('div')
  scrollArea.className = 'toc-scroll'
  scrollArea.append(tree)
  aside.append(toolbar, scrollArea)
  layout.classList.add('has-toc')
  layout.insertBefore(aside, mainEl)
  // The core page's sticky theme bar owns the top edge; stick below it.
  const bar = document.querySelector('.theme-picker')
  if (bar) { aside.style.setProperty('--toc-top', `${bar.offsetHeight + 12}px`) }

  const drawerMq = window.matchMedia('(max-width: 62rem)')
  const isOpen = () => document.body.classList.contains('toc-open')

  // --- scrollspy -----------------------------------------------------------
  let activeLink = null
  let currentBlockEl = null
  const sync = () => {
    // Fit the sticky sidebar to the VISIBLE viewport: while the page nav is
    // still in view the aside starts below the viewport top, so a fixed
    // 100vh-ish box overflows the bottom and its last rows are unreachable.
    // Drawer mode owns its own geometry.
    if (!drawerMq.matches) {
      aside.style.maxHeight = `${Math.max(0, window.innerHeight - Math.max(0, aside.getBoundingClientRect().top))}px`
    }
    const y = window.scrollY + 120
    let cur = null
    let curEl = null
    for (const [el, link] of targets) { if (el.offsetTop <= y) { cur = link; curEl = el } else { break } }
    if (cur === activeLink) { return }
    if (activeLink) { activeLink.classList.remove('active') }
    activeLink = cur
    // The content side answers the sidebar: paint the block owning the active
    // anchor (the article for an h3 inside one, else its section) - the same
    // scroll-following highlight as the site API pages (build-site.mjs).
    if (currentBlockEl) { currentBlockEl.classList.remove('current-block') }
    currentBlockEl = curEl ? curEl.closest('article, section') : null
    if (currentBlockEl) { currentBlockEl.classList.add('current-block') }
    if (activeLink) {
      activeLink.classList.add('active')
      // Keep the highlight visible inside the sidebar's own overflow - but
      // NEVER while the user is browsing the sidebar (pointer over it or
      // focus inside it): re-scrolling to the active row on every change
      // would yank the sidebar away from where the user scrolled it. Skip
      // while the drawer sits closed off-screen too.
      const userBrowsingToc = aside.matches(':hover') || aside.matches(':focus-within')
      if ((!drawerMq.matches || isOpen()) && !userBrowsingToc) { activeLink.scrollIntoView({ block: 'nearest' }) }
    }
  }
  window.addEventListener('scroll', () => { window.requestAnimationFrame(sync) }, { passive: true })
  window.addEventListener('resize', () => { window.requestAnimationFrame(sync) }, { passive: true })
  sync()

  // --- text filter ---------------------------------------------------------
  // A section li's textContent includes its children, so a child match keeps
  // its section visible (same behavior as the site sidebar). Because both
  // levels stay visible around a match, the match itself is wrapped in
  // <mark>s to show WHY a row survived.
  const renderLinkText = (a, q) => {
    const text = linkTexts.get(a)
    if (q === '') {
      a.textContent = text
      return
    }
    const lower = text.toLowerCase()
    a.replaceChildren()
    let from = 0
    for (let hit = lower.indexOf(q); hit !== -1; hit = lower.indexOf(q, hit + q.length)) {
      a.append(text.slice(from, hit))
      const mark = document.createElement('mark')
      mark.textContent = text.slice(hit, hit + q.length)
      a.append(mark)
      from = hit + q.length
    }
    a.append(text.slice(from))
  }
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase()
    for (const li of tree.querySelectorAll('li')) {
      li.hidden = q !== '' && !li.textContent.toLowerCase().includes(q)
    }
    for (const [, link] of targets) { renderLinkText(link, q) }
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
  // Entering the drawer also drops the desktop inline max-height (the drawer
  // is CSS-sized); leaving it, the next sync() re-applies the fit.
  drawerMq.addEventListener('change', () => {
    closeDrawer(false)
    aside.style.maxHeight = ''
  })

  // --- initial fragment ----------------------------------------------------
  // ids exist only after this script runs, so the browser's own load-time
  // fragment scroll found nothing; redo it.
  if (location.hash.length > 1) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (target) { target.scrollIntoView() }
  }
}

// --- back-to-top button ------------------------------------------------------
// Same behavior as the site pages (scripts/build-site.mjs): appears after one
// viewport of scroll; instant jump on purpose - a smooth scroll over these
// page lengths runs for seconds and any input cancels it midway, which reads
// as a stuck button.
{
  const topBtn = document.createElement('button')
  topBtn.className = 'back-to-top'
  topBtn.hidden = true
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  arrow.setAttribute('viewBox', '0 0 24 24')
  arrow.setAttribute('aria-hidden', 'true')
  const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  arrowPath.setAttribute('fill', 'currentColor')
  arrowPath.setAttribute('d', 'M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z')
  arrow.appendChild(arrowPath)
  topBtn.append(arrow, 'Top')
  document.body.appendChild(topBtn)
  const syncTopBtn = () => { topBtn.hidden = window.scrollY < window.innerHeight }
  window.addEventListener('scroll', syncTopBtn, { passive: true })
  syncTopBtn()
  topBtn.addEventListener('click', () => { window.scrollTo(0, 0) })
}
