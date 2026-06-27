// Opt-in icon helpers. None of these is used by the library by default; pass
// the arrow ones via `settings.createArrowElFn`, or use the check / checkbox
// ones inside a custom item renderer (override `createItemEl` / `itemToString`)
// so people who do not want to pull in mdi / FontAwesome still get sensible
// built-ins. All paths use fill="currentColor" so they inherit the
// surrounding text color (light/dark themes "just work"). Paths are from
// Material Design Icons (MIT).

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Options accepted by the built-in icon helpers. */
export interface IconOptions {
  /** Width and height of the SVG in pixels. Default 16. */
  size?: number
}

function createSvgEl(viewBox: string, pathD: string, size: number): SVGElement {
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
export function createTriangleDownSvgEl(opts: IconOptions = {}): SVGElement {
  return createSvgEl('0 0 24 24', 'M4 8l8 10 8-10z', opts.size ?? 16)
}

/** Material Design `expand_more` chevron pointing down (filled outline). */
export function createChevronDownSvgEl(opts: IconOptions = {}): SVGElement {
  return createSvgEl(
    '0 0 24 24',
    'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z',
    opts.size ?? 16,
  )
}

/**
 * Standalone checkmark (no box). Useful as a "selected" indicator in single
 * mode, or as a lightweight chosen marker in multi mode.
 */
export function createCheckSvgEl(opts: IconOptions = {}): SVGElement {
  return createSvgEl(
    '0 0 24 24',
    'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
    opts.size ?? 16,
  )
}

/** Visual state of a {@link createCheckboxSvgEl}. `indeterminate` is the "mixed" / */
/** partial state used by a select-all control (`aria-checked="mixed"`). */
export type CheckboxState = 'unchecked' | 'checked' | 'indeterminate'

const CHECKBOX_PATHS: Record<CheckboxState, string> = {
  // mdi checkbox-blank-outline
  unchecked:
    'M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z',
  // mdi checkbox-outline (box + tick)
  checked:
    'M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,5V19H5V5H19M10,17L6,13L7.41,11.58L10,14.17L16.59,7.58L18,9',
  // mdi minus-box-outline (box + dash)
  indeterminate:
    'M19,19V5H5V19H19M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5C3,3.89 3.9,3 5,3H19M17,11V13H7V11H17Z',
}

export interface CheckboxIconOptions extends IconOptions {
  /** Which checkbox state to draw. Default `'unchecked'`. */
  state?: CheckboxState
}

/**
 * Outline checkbox icon in one of three states (unchecked / checked /
 * indeterminate). Intended for multi-select item rows and the select-all
 * control. Decorative only (`aria-hidden`); the real state is carried by
 * `aria-selected` on the item or `aria-checked` on the control.
 */
export function createCheckboxSvgEl(opts: CheckboxIconOptions = {}): SVGElement {
  const state = opts.state ?? 'unchecked'
  return createSvgEl('0 0 24 24', CHECKBOX_PATHS[state], opts.size ?? 16)
}
