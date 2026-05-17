// Opt-in icon helpers. None of these is used by the library by default; pass
// them via `settings.renderArrowFn` if you want a built-in dropdown arrow.
// All paths use fill="currentColor" so they inherit the trigger text color
// (light/dark themes "just work").

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Options accepted by the built-in icon helpers. */
export interface IconOptions {
  /** Width and height of the SVG in pixels. Default 16. */
  size?: number
}

function makeSvg(viewBox: string, pathD: string, size: number): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('viewBox', viewBox)
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', pathD)
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

/**
 * Solid filled triangle pointing down. Sized to roughly match the chevron's
 * visual weight (MDI's `arrow_drop_down` path occupies a small portion of
 * its 24x24 viewBox and looks too small next to other icons).
 */
export function triangleDownSvg(opts: IconOptions = {}): SVGElement {
  return makeSvg('0 0 24 24', 'M4 8l8 10 8-10z', opts.size ?? 16)
}

/** Material Design `expand_more` chevron pointing down (filled outline). */
export function chevronDownSvg(opts: IconOptions = {}): SVGElement {
  return makeSvg(
    '0 0 24 24',
    'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z',
    opts.size ?? 16,
  )
}
