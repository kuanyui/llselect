// Opt-in icon helpers. None of these is used by the library by default; pass
// the arrow ones via `settings.createTriggerArrowContentElFn`, or use the checkmark / checkbox
// ones inside a custom item renderer (override `createItemEl` / `itemToString`)
// so people who do not want to pull in mdi / FontAwesome still get sensible
// built-ins. All paths use fill="currentColor" so they inherit the
// surrounding text color (light/dark themes "just work"). Paths are from
// Material Design Icons (MIT).

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Options accepted by the built-in icon helpers.
 * @group Icons
 * @category Shared
 */
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
 * @group Icons
 * @category Arrows
 */
export function createTriangleDownSvgEl(opts: IconOptions = {}): SVGElement {
  return createSvgEl('0 0 24 24', 'M4 8l8 10 8-10z', opts.size ?? 16)
}

/**
 * Material Design `expand_more` chevron pointing down (filled outline).
 * @group Icons
 * @category Arrows
 */
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
 * @group Icons
 * @category Checkmarks & checkboxes
 */
export function createCheckmarkSvgEl(opts: IconOptions = {}): SVGElement {
  return createSvgEl(
    '0 0 24 24',
    'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
    opts.size ?? 16,
  )
}

/**
 * Visual state of {@link createOutlinedCheckboxSvgEl} / {@link createFilledCheckboxSvgEl}.
 * `indeterminate` is the "mixed" / partial state used by a select-all control
 * (`aria-checked="mixed"`).
 * @group Icons
 * @category Checkmarks & checkboxes
 */
export type CheckboxState = 'unchecked' | 'checked' | 'indeterminate'

const OUTLINED_CHECKBOX_PATHS: Record<CheckboxState, string> = {
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

/**
 * Options accepted by {@link createOutlinedCheckboxSvgEl} and
 * {@link createFilledCheckboxSvgEl}.
 * @group Icons
 * @category Checkmarks & checkboxes
 */
export interface CheckboxIconOptions extends IconOptions {
  /**
   * Which checkbox state to draw. Accepts the icon vocabulary
   * (`'unchecked' | 'checked' | 'indeterminate'`) or, as a convenience, the
   * select-all row's chosen-state vocabulary (`'none'` -> unchecked,
   * `'some'` -> indeterminate, `'all'` -> checked), so
   * `createSelectAllRowContentElFn` can pass its state straight through.
   * Default `'unchecked'`.
   */
  state?: CheckboxState | 'none' | 'some' | 'all'
}

/** Map the select-all row's chosen-state vocabulary onto the icon vocabulary. */
function resolveCheckboxState(raw: NonNullable<CheckboxIconOptions['state']>): CheckboxState {
  return raw === 'none' ? 'unchecked' : raw === 'some' ? 'indeterminate' : raw === 'all' ? 'checked' : raw
}

/**
 * Outlined checkbox icon: box border with the tick (`checked`) / dash
 * (`indeterminate`) drawn inside, all in `currentColor`; the filled twin is
 * {@link createFilledCheckboxSvgEl}. Intended for multi-select item rows and
 * the select-all control. Decorative only (`aria-hidden`); the real state is
 * carried by `aria-selected` on the item or `aria-checked` on the control.
 * @group Icons
 * @category Checkmarks & checkboxes
 */
export function createOutlinedCheckboxSvgEl(opts: CheckboxIconOptions = {}): SVGElement {
  const state = resolveCheckboxState(opts.state ?? 'unchecked')
  return createSvgEl('0 0 24 24', OUTLINED_CHECKBOX_PATHS[state], opts.size ?? 16)
}

const FILLED_CHECKBOX_PATHS: Record<CheckboxState, string> = {
  // Material's unchecked is the same outline box in both looks.
  unchecked: OUTLINED_CHECKBOX_PATHS.unchecked,
  // mdi checkbox-marked (solid box, tick cut out)
  checked:
    'M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z',
  // mdi minus-box (solid box, dash cut out)
  indeterminate:
    'M17,13H7V11H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z',
}

/**
 * Material-look checkbox icon: a solid rounded box with the tick (`checked`)
 * / dash (`indeterminate`) cut out; `unchecked` draws the same outline box as
 * {@link createOutlinedCheckboxSvgEl}. Same options, including the chosen-state
 * vocabulary. Decorative only (`aria-hidden`); the real state is carried by
 * `aria-selected` on the item or `aria-checked` on the control.
 * @group Icons
 * @category Checkmarks & checkboxes
 */
export function createFilledCheckboxSvgEl(opts: CheckboxIconOptions = {}): SVGElement {
  const state = resolveCheckboxState(opts.state ?? 'unchecked')
  return createSvgEl('0 0 24 24', FILLED_CHECKBOX_PATHS[state], opts.size ?? 16)
}
