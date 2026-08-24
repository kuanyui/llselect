/**
 * LLTreeMultipleSelect - a tree multiple select built by SUBCLASSING
 * LLSelectMultiple. Demo material; copy and adapt. Not part of the library:
 * a tree lives and dies by its data-structure choices, so it belongs in app
 * land (or its own package), and here it doubles as the worked example of
 * the extension seams:
 *
 * - Typed subclass settings: `defaultExpandDepth` rides the constructor's
 *   `subclassSettings` channel (the base class's `S` generic param), so a
 *   typo in the field name is a compile error.
 * - `getVisibleItems()` override: visible = the flatten of the expanded
 *   branches. The result is CACHED and invalidated by a version counter -
 *   the same pattern as the core's `hideChosenRows` cache. Deriving a list
 *   per call without a cache is how a subclass ruins performance.
 * - `createItemEl` / `createItemContentEl` overrides: indent by depth, a
 *   caret on branch rows (click = expand / collapse), a folder icon that
 *   follows the expand state, and a tri-state checkbox derived from the
 *   leaf descendants. The caret / folder are MDI font icons
 *   (`<i class="mdi mdi-...">`, loaded by the examples page) - swap for
 *   your own icon system when copying. The caret's hit-area and hover
 *   styling live in the demo's style.css (region 14.2); copy that rule too.
 * - `onItemActivated` override: activating a branch toggles its whole leaf
 *   subtree; leaves keep the normal toggle (`super`).
 * - Leaves-only model contract: `setChosenItems` drops branches (the one
 *   entry point every raw array passes through), and `getVisibleEnabledItems` +
 *   `toggleAll` overrides keep the bulk ops deciding over leaves only.
 *
 * Deliberate demo cuts, so the example stays readable:
 * - The model value is the chosen LEAVES; branches are never in it.
 * - While a filter query is active, matches render as a flat list (no
 *   ancestor chains).
 * - `compareFn` stays the identity default; `hideChosenRows` and grouping
 *   are not combined with the tree; keyboard expand / collapse
 *   (ArrowRight / ArrowLeft) is not wired.
 * - Rows stay `role="option"` (`aria-level` / `aria-expanded` are not valid
 *   there). A production tree should weigh a real `tree` role model.
 */
import {
  LLSelectMultiple,
  createFilledCheckboxSvgEl,
  type LLSelectCheckboxState,
  type LLSelectMultipleSettings,
  type LLSelectSettingsInputOf,
} from '../../src/index.js'

/** One tree node. Branches carry `children`; leaves do not. */
export interface LLTreeNode {
  text: string
  children?: readonly LLTreeNode[]
}

/**
 * Settings of {@link LLTreeMultipleSelect}: the multiple-select settings plus
 * the tree's own field.
 */
export interface LLTreeMultipleSelectSettings extends LLSelectMultipleSettings<LLTreeNode, string> {
  /** How many levels start expanded. `0` = all collapsed, `1` (default) = the roots. */
  defaultExpandDepth: number
}

export class LLTreeMultipleSelect extends LLSelectMultiple<LLTreeNode, string, LLTreeMultipleSelectSettings> {
  private roots: readonly LLTreeNode[] = []
  /** node -> nesting level, rebuilt by `setTreeItems`. */
  private depths = new Map<LLTreeNode, number>()
  /** branch -> its leaf descendants, rebuilt by `setTreeItems`. */
  private leafDescendants = new Map<LLTreeNode, LLTreeNode[]>()
  private expandedBranches = new Set<LLTreeNode>()
  /** Bumped on every expand / collapse; the flatten cache keys on it. */
  private expandVersion = 0
  private flattenCache: { version: number, result: LLTreeNode[] } | null = null

  constructor(targetEl: HTMLElement, settings?: LLSelectSettingsInputOf<LLTreeMultipleSelectSettings>) {
    // Nodes are objects, so default their string form to `text` (drives the
    // accessible name and the filter); an explicit itemToStringFn wins. The
    // third argument is the typed subclassSettings channel: only the tree's
    // own resolved fields go here; a misspelled key would not compile.
    super(targetEl, { itemToStringFn: (node) => node.text, ...settings }, {
      defaultExpandDepth: settings?.defaultExpandDepth ?? 1,
    })
  }

  /**
   * Load the tree. The flat item list handed to `setItems` is every node in
   * display order; visibility of the collapsed part is `getVisibleItems`'s
   * job, exactly like the core's filter.
   */
  public setTreeItems(roots: readonly LLTreeNode[]): void {
    this.roots = roots
    this.depths.clear()
    this.leafDescendants.clear()
    this.expandedBranches.clear()
    const all: LLTreeNode[] = []
    const walk = (nodes: readonly LLTreeNode[], depth: number): LLTreeNode[] => {
      let leaves: LLTreeNode[] = []
      for (const node of nodes) {
        this.depths.set(node, depth)
        all.push(node)
        if (isBranch(node)) {
          if (depth < this.settings.defaultExpandDepth) { this.expandedBranches.add(node) }
          const below = walk(node.children, depth + 1)
          this.leafDescendants.set(node, below)
          leaves = leaves.concat(below)
        } else {
          leaves.push(node)
        }
      }
      return leaves
    }
    walk(roots, 0)
    this.expandVersion += 1
    this.setItems(all)
  }

  /**
   * The flatten of the expanded branches, cached until the next expand /
   * collapse. While a filter query is active, the flat matching subset
   * (`super`) renders instead.
   */
  public override getVisibleItems(): readonly LLTreeNode[] {
    if (this.getFilterQuery() !== '') { return super.getVisibleItems() }
    if (this.flattenCache !== null && this.flattenCache.version === this.expandVersion) {
      return this.flattenCache.result
    }
    const result: LLTreeNode[] = []
    const walk = (nodes: readonly LLTreeNode[]): void => {
      for (const node of nodes) {
        result.push(node)
        if (isBranch(node) && this.expandedBranches.has(node)) { walk(node.children) }
      }
    }
    walk(this.roots)
    this.flattenCache = { version: this.expandVersion, result }
    return result
  }

  /** Expand or collapse one branch and repaint the open popup. */
  public toggleExpanded(branch: LLTreeNode): void {
    if (!isBranch(branch)) { return }
    if (this.expandedBranches.has(branch)) {
      this.expandedBranches.delete(branch)
    } else {
      this.expandedBranches.add(branch)
    }
    this.expandVersion += 1
    if (this.isOpened()) { this.renderPopupList() }
  }

  /** Branch activation toggles its leaf subtree; a leaf keeps the normal toggle. */
  protected override onItemActivated(node: LLTreeNode): void {
    if (!isBranch(node)) {
      super.onItemActivated(node)
      // The base repaints only the toggled row, but every ancestor branch
      // derives its tri-state from the leaves - repaint the whole list so
      // those checkboxes stay fresh.
      if (this.isOpened()) { this.renderPopupList() }
      return
    }
    this.toggleSubtree(node)
  }

  /** Toggle every enabled leaf under `branch` between all-chosen and none. */
  private toggleSubtree(branch: LLTreeNode): void {
    const actionable = (this.leafDescendants.get(branch) ?? []).filter(leaf => !this.isItemEffectivelyDisabled(leaf))
    if (actionable.length === 0) { return }
    const allChosen = actionable.every(leaf => this.isChosen(leaf))
    if (allChosen) {
      const drop = new Set(actionable)
      this.setChosenItems(this.getChosenItems().filter(leaf => !drop.has(leaf)))
    } else {
      const additions = actionable.filter(leaf => !this.isChosen(leaf))
      this.setChosenItems([...this.getChosenItems(), ...additions])
    }
  }

  /**
   * The model holds LEAVES only. Every raw array passes through this one
   * entry point, so branch nodes are dropped here.
   */
  public override setChosenItems(items: readonly LLTreeNode[]): void {
    super.setChosenItems(items.filter(node => !isBranch(node)))
  }

  /**
   * Bulk ops must also DECIDE over leaves only: branches can never be
   * chosen, so leaving them in the all-chosen checks would keep `toggleAll`
   * and the choose-all row stuck in their "choose" direction (and the row's
   * counts wrong). This seam narrows `toggleAllVisible` + the choose-all
   * row; `toggleAll` below narrows the whole-list variant.
   */
  protected override getVisibleEnabledItems(): readonly LLTreeNode[] {
    return super.getVisibleEnabledItems().filter(node => !isBranch(node))
  }

  /** Same leaves-only narrowing for the whole-list toggle. */
  public override toggleAll(): void {
    const leaves = this.getItems().filter(node => !isBranch(node) && !this.isItemEffectivelyDisabled(node))
    const allChosen = leaves.length > 0 && leaves.every(leaf => this.isChosen(leaf))
    if (allChosen) { this.unchooseAll() } else { this.chooseAll() }
  }

  /** A branch toggles its whole leaf subtree, same as activating its row. */
  public override toggleItem(node: LLTreeNode): void {
    if (isBranch(node)) {
      this.toggleSubtree(node)
      return
    }
    super.toggleItem(node)
  }

  /**
   * Indent by depth; branches get `data-tree-state` (expanded / collapsed)
   * and `data-tree-chosen` (the derived tri-state) hooks for CSS and tests.
   */
  protected override createItemEl(node: LLTreeNode, index: number): HTMLElement {
    const el = super.createItemEl(node, index)
    // 0.75rem base mirrors the vanilla theme's row padding; the override
    // replaces the theme's padding-inline-start.
    el.style.paddingInlineStart = `${0.75 + (this.depths.get(node) ?? 0) * 1.25}rem`
    if (isBranch(node)) {
      el.setAttribute('data-tree-state', this.expandedBranches.has(node) ? 'expanded' : 'collapsed')
      el.setAttribute('data-tree-chosen', this.branchState(node))
    }
    return el
  }

  /**
   * Branch: caret + tri-state checkbox + folder (amber) + text. Leaf: an
   * alignment spacer + checkbox + file (blue) + text. The caret, folder and
   * file are MDI font icons (the examples page loads the font; colors in
   * the demo CSS); the checkboxes are the library's inline SVGs.
   */
  protected override createItemContentEl(node: LLTreeNode): HTMLElement {
    const wrap = document.createElement('span')
    wrap.style.display = 'inline-flex'
    wrap.style.alignItems = 'center'
    wrap.style.gap = '0.4rem'
    if (isBranch(node)) {
      const expanded = this.expandedBranches.has(node)
      // One big chevron; the demo CSS rotates it to point down via the
      // row's data-tree-state.
      const caret = document.createElement('i')
      caret.className = 'tree-caret mdi mdi-chevron-right'
      caret.setAttribute('aria-hidden', 'true')
      // The row's mousedown is default-prevented by the library (focus
      // stays on the combobox host), but click still fires. Stop it here so
      // the caret only expands / collapses, never toggles the subtree.
      caret.addEventListener('click', (ev) => {
        ev.stopPropagation()
        this.toggleExpanded(node)
      })
      wrap.appendChild(caret)
      wrap.appendChild(createFilledCheckboxSvgEl({ state: this.branchState(node) }))
      const folder = document.createElement('i')
      folder.className = `tree-folder mdi ${expanded ? 'mdi-folder-open' : 'mdi-folder'}`
      folder.setAttribute('aria-hidden', 'true')
      wrap.appendChild(folder)
    } else {
      // Same width as the caret box (styled in the demo CSS), so sibling
      // leaf and branch texts align.
      const spacer = document.createElement('span')
      spacer.className = 'tree-caret-spacer'
      wrap.appendChild(spacer)
      wrap.appendChild(createFilledCheckboxSvgEl({ state: this.isChosen(node) ? 'checked' : 'unchecked' }))
      const file = document.createElement('i')
      file.className = 'tree-file mdi mdi-file'
      file.setAttribute('aria-hidden', 'true')
      wrap.appendChild(file)
    }
    wrap.appendChild(document.createTextNode(node.text))
    return wrap
  }

  /** Derived tri-state of a branch: how many of its leaf descendants are chosen. */
  private branchState(branch: LLTreeNode): LLSelectCheckboxState {
    const leaves = this.leafDescendants.get(branch) ?? []
    let chosen = 0
    for (const leaf of leaves) {
      if (this.isChosen(leaf)) { chosen += 1 }
    }
    if (chosen === 0) { return 'unchecked' }
    return chosen === leaves.length ? 'checked' : 'indeterminate'
  }
}

function isBranch(node: LLTreeNode): node is LLTreeNode & { children: readonly LLTreeNode[] } {
  return node.children !== undefined && node.children.length > 0
}
