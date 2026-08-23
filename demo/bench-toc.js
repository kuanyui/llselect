// Scrollspy for the benchmark page's quick-jump TOC (.bench-toc). The nav's
// own anchor list is the single source; the CSS docks it to the left gutter
// on large desktops (style.css). Deliberately tiny: no filter, no drawer, no
// height fitting - the examples pages' toc.js stays their own thing.

const nav = document.querySelector('.bench-toc')
if (nav) {
  // [target element, link] in document order (the nav lists them in order).
  const targets = []
  for (const a of nav.querySelectorAll('a[href^="#"]')) {
    const el = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)))
    if (el) { targets.push([el, a]) }
  }
  let activeLink = null
  const sync = () => {
    const y = window.scrollY + 120
    let cur = null
    for (const [el, link] of targets) { if (el.offsetTop <= y) { cur = link } else { break } }
    if (cur === activeLink) { return }
    if (activeLink) { activeLink.classList.remove('active') }
    activeLink = cur
    if (activeLink) { activeLink.classList.add('active') }
  }
  window.addEventListener('scroll', () => { window.requestAnimationFrame(sync) }, { passive: true })
  window.addEventListener('resize', () => { window.requestAnimationFrame(sync) }, { passive: true })
  sync()
}
