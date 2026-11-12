# Changelog

This file lists the notable changes of each version. With it, a reader can trace a change of behavior or performance to its version.

- `@llselect/core` and `@llselect/angularjs` share one version number.
- A line that starts with "AngularJS:" is about the AngularJS package.
- Each section lists the changes since the version before it. A section uses the names of its own version.
- "Breaking" lists the changes that need a change in an app that used the version before.
- "Performance" names the changes that moved the benchmark numbers. The benchmark history page, `demo/bench-history.html`, measures every published version on one machine.

## Unreleased

### Added

- `popupDistanceFromTriggerWrapper` sets the gap between the popup and the trigger wrapper.
- `popupDistanceFromViewportEdge` sets the smallest gap between the popup and the edge of the viewport.
- `createChevronUpDownSvgEl` and `createTriangleUpDownSvgEl` draw arrows that point both up and down.
- The shipped themes do not turn an up-down arrow while the popup is open.
- The behavior presets also set the outside-click behavior.
- AngularJS: `ll-popup-distance-from-trigger-wrapper` and `ll-popup-distance-from-viewport-edge`.
- AngularJS: `ll-behavior-of-outside-click`.
- AngularJS: `ll-arrow` takes `chevron-up-down`.
- AngularJS: `ll-arrow` takes `triangle-up-down`.

### Fixed

- `open()` does nothing once `destroy()` has started.
- `open()` stops when a function it calls closes the popup.
- When a touch closes the popup at its start, the select component holds the rest of that touch. The hold now ignores clicks that no pointer made.
- The hold of a touch also ends when a mouse or a pen presses.
- When a press outside the popup is blocked, only the click of that press is held back.
- A blocked press outside the popup no longer moves focus.
- TypeScript finds the types of `@llselect/core/i18n` and `@llselect/core/behavior-presets` also under its older node module resolution.

### Breaking

- `outsideClickBehavior` is renamed `behaviorOfOutsideClick`.
- The default outside-click behavior is now `'block'`, so a click outside the open popup only closes it. To let the click reach the page as before, write `behaviorOfOutsideClick: 'pass-through'`.
- `scrollGestureToBehaviorFn` is renamed `behaviorOfScrollGestureFn`.
- `zoomGestureToBehaviorFn` is renamed `behaviorOfZoomGestureFn`.
- `defaultScrollGestureToBehavior` is renamed `defaultBehaviorOfScrollGesture`.
- `defaultZoomGestureToBehavior` is renamed `defaultBehaviorOfZoomGesture`.
- The protected `scrollGestureToBehavior` is renamed `behaviorOfScrollGesture`.
- The protected `zoomGestureToBehavior` is renamed `behaviorOfZoomGesture`.
- `behaviorPresetsOfLLSelectDefault` is renamed `behaviorPresetsOfOriginalLLSelect`.
- AngularJS: `ll-scroll-gesture-to-behavior-fn` is renamed `ll-behavior-of-scroll-gesture-fn`.
- AngularJS: `ll-zoom-gesture-to-behavior-fn` is renamed `ll-behavior-of-zoom-gesture-fn`.

### Performance

- The screen-reader text of each trigger is now a copy of one template element. Before, each one wrote ten inline styles of its own. The change aims at the build time that 0.0.13 added.
- `destroy()` now puts the closed state back on every select component, also on one that never opened. Teardown takes longer.

## 0.0.14

### Added

- `scrollGestureToBehaviorFn` decides what a scroll gesture does while the popup is open.
- `zoomGestureToBehaviorFn` decides what a two-finger zoom does while the popup is open.
- `@llselect/core/behavior-presets` holds presets that copy the native select of a browser.
- `behaviorPresetsOfChromiumOnWindows` copies Chromium on Windows.
- `behaviorPresetsOfFirefoxOnWindows` copies Firefox on Windows.
- `behaviorPresetsOfSafariOnMac` copies Safari on macOS.
- `behaviorPresetsOfLLSelectDefault` holds the library's own defaults.
- `defaultScrollGestureToBehavior` and `defaultZoomGestureToBehavior` are the default functions. A custom function can call them.
- The meta of `onClose` carries the scroll gesture or the zoom gesture that closed the popup.
- When a touch closes the popup at its start, the select component holds the rest of that touch. So the click of that touch does not reopen the popup.
- AngularJS: `ll-scroll-gesture-to-behavior-fn`, with the local `$scrollGesture`.
- AngularJS: `ll-zoom-gesture-to-behavior-fn`, with the local `$zoomGesture`.

### Fixed

- The popup follows a pan of the visual viewport.
- The popup stays inside the visible area when its trigger is not.
- On a pinch-zoomed page, the popup keeps its place, also in WebKit and on a transformed root element.

## 0.0.13

### Added

- The trigger wrapper holds the trigger. It also holds the trigger buttons strip when `clearable` or tags mode asks for one.
- The strip holds the tags and the clear button. Their text no longer reaches the value that a screen reader reads from the trigger.
- The trigger carries a visually hidden screen-reader text. `triggerContextToScreenReaderTextFn` builds it.
- The close reason `'trigger-buttons'` names focus that enters the trigger buttons strip.
- `open()` warns once per page when it refuses to open a hidden trigger.

### Changed

- While the filter is active, the popup is a named dialog.
- Action rows carry `aria-selected="false"`. The row positions that a screen reader hears skip them.
- The check for a hidden trigger follows the chain of containing blocks. It also works inside shadow roots.

### Fixed

- In Safari, a keydown with keyCode 229 stays with the IME.
- If the browser refuses to show the popup, the select component stays closed.
- `open()` stops when the popup closes during `showPopover()`.
- A multiple select component may have `undefined` as its first chosen item. The popup now opens with focus on its row.

### Breaking

- The width policy `'match-trigger'` is renamed `'match-trigger-wrapper'`.
- The translation key `triggerCountSummary` is renamed `triggerContentCountText`.
- Three translation keys are new. A custom pack without them shows the English text for them.
  - `triggerButtonsAriaLabel`
  - `triggerScreenReaderCountText`
  - `triggerScreenReaderItemsText`
- The class map entry `triggerValueId` and the protected `triggerValueEl` are removed.
- The protected `commitTriggerContentToDom` takes no second argument. A subclass gives the screen-reader text through `computeTriggerScreenReaderText`.
- The theme variable `--llselect-trigger-line` is renamed `--llselect-trigger-wrapper-line`.
- The theme variable `--llselect-trigger-hover-line` is renamed `--llselect-trigger-wrapper-hover-line`.
- The trigger wrapper now carries the state attributes, such as `data-state`, in place of the trigger.
- The same holds for `data-empty` and `data-disabled`.

### Performance

- Every select component builds one more element, the trigger wrapper.
- The screen-reader text has a layout box and ten inline styles.
- Together they make many new select components take longer before the first paint. Teardown takes longer too.
- The positioner ignores scrolls inside the popup.

## 0.0.12

### Fixed

- A nested select component keeps its own color scheme.
- A nested root element decides its color scheme after the outer ones.

### Performance

- In automatic mode, new select components read all their root elements before any writes its color-scheme attribute.
- This covers the root elements outside other select components.
- In automatic mode, the constructor writes a provisional color-scheme attribute. If the guess holds, nothing more is written.
- Only automatic decisions on connected root elements are remembered.

## 0.0.11

### Added

- `onBeforeChange` runs before a user change and can stop it.
- The change meta carries `reason` and `item`.
- `onFocus` runs after focus enters the select component. `onBlur` runs after focus leaves it.
- `onActiveItemChange` reports the item of the active row after each change.
- `onOpen` receives `meta.reason`, the path that opened the popup.
- `onClose` receives `meta.reason`, the path that closed the popup.
- `itemToLangFn` sets the `lang` attribute of a row from its item.
- `groupKeyToLangFn` sets the `lang` attribute of a group label from its group key.
- AngularJS: `ll-on-before-change` runs before a user change and can stop it.
- AngularJS: in that expression, `$next` is the value about to be set and `$previous` the current one.
- AngularJS: `$event.preventDefault()` stops the change.
- AngularJS: `ll-on-focus` and `ll-on-blur`.
- AngularJS: a blur of the select component sets the touched flag of `ngModel`.
- AngularJS: `ll-on-active-item-change`, with the local `$item`.
- AngularJS: `ll-item-to-lang-fn` and `ll-group-key-to-lang-fn`.
- AngularJS: the local `$reason` holds the reason in the open and close expressions.
- AngularJS: the ui-select bridge maps `on-highlight` onto `onActiveItemChange`.

### Changed

- `close()` returns focus before it hides the popup.

### Fixed

- A fit-content popup width no longer rounds short.
- The popup no longer collapses in WebKit 18.

## 0.0.10

### Added

- Every theme defines its colors as CSS variables, with dark values.
- `colorScheme` picks light, dark or automatic.
- `getColorScheme()` reads the decision, and `refreshColorScheme()` decides again.
- The root element carries the decision in `data-llselect-color-scheme`.
- `chosenItemsOrder` orders the chosen items of a multiple select component, as chosen or as listed.
- AngularJS: `ll-color-scheme` and `ll-chosen-items-order`.

### Breaking

- `createItemContentElFn` is renamed `createPopupListItemContentElFn`.
- The protected `createItemEl` is renamed `createPopupListItemEl`.
- The protected `createItemContentEl` is renamed `createPopupListItemContentEl`.
- The protected `onItemActivated` is renamed `onPopupListItemActivated`.
- The class map entries of item rows now start with `popupListRow`.
- The default CSS classes of item rows now start with `llselect-popup-list-row` instead of `llselect-item`.

### Performance

- Each select component decides its color scheme in a microtask after construction.
- That decision reads computed style, which costs time before the first paint.

## 0.0.9

### Added

- `createPopupHeaderContentElFn` and `createPopupFooterContentElFn` fill a popup header and footer.
- `popupListLeadingActionRows` and `popupListTrailingActionRows` add action rows before and after the items.
- `popupListLeadingRowsPinned` and `popupListTrailingRowsPinned` keep those rows in place while the list scrolls.
- `onFilterQueryChange` reports every change of the filter query.
- `getVisibleEnabledItems()` is public on the multiple select component.
- Esc closes the popup also while focus is inside the popup content.
- `close()` returns focus from inside the popup to the trigger.
- AngularJS: `ll-popup-header-content-fn` and `ll-popup-footer-content-fn`.
- AngularJS: `ll-popup-list-leading-action-rows` and `ll-popup-list-trailing-action-rows`.
- AngularJS: `ll-popup-list-leading-rows-pinned` and `ll-popup-list-trailing-rows-pinned`.
- AngularJS: `ll-on-filter-query-change`, with the local `$query`.
- AngularJS: `ui-llselect` takes an app-wide translation pack and width policy, and offers `instance()`.

### Changed

- The library calls settings functions and action-row functions as plain functions, not as methods of an object.

### Breaking

- The protected methods of the leading row take choose-all names, such as `createPopupListChooseAllRowEl`.

## 0.0.8

### Added

- Prefix typeahead works while the filter is inactive, like in a native select.

## 0.0.7

### Added

- The constructors are typed in the item type, so typed callbacks infer it.
- AngularJS: `ll-on-open` and `ll-on-close`.

### Changed

- Item identity is SameValueZero by default, so a `NaN` item is one item.

### Fixed

- Every `setItems()` refreshes the trigger content.
- `rerender()` rebuilds the clear button.
- Focus reads work inside shadow roots.
- AngularJS: the ui-select bridge releases the scopes of its trigger templates.

## 0.0.6

### Added

- The meta of `onChange` carries `source`. It tells a user change from a change through the API.
- A select component without an accessible name warns once per page in the console.
- `setItems()` accepts a readonly array.
- With the default `compareFn`, `setItems()` warns on duplicate items.
- AngularJS: in the ui-select bridge, the host's `aria-label` becomes `ariaLabel`.

### Changed

- `setItems()` adopts new objects that equal the chosen ones by `compareFn`.
- That adoption fires no `onChange`.
- AngularJS: without a track-by, the ui-select bridge compares items with `angular.equals`, like ui-select.

### Fixed

- Disabled clear buttons and tag buttons are inert.
- The outside-click check sees through a shadow root of the host.
- `setChosenItems()` drops duplicates through `compareFn`.
- A click anywhere in the popup keeps focus on the trigger or the filter input.
- AngularJS: a model value set before its items arrive resolves once they arrive.

### Breaking

- Five public types gain the `LLSelect` prefix, such as `LLSelectWidthPolicy`.

### Performance

- With the default `compareFn`, the multiple select component checks chosen items through a set.

## 0.0.5

### Added

- `isOpened()` tells whether the popup is open.
- `setPlaceholder()` changes the placeholder text.
- `getFilterQuery()` returns the filter query.
- `getVisibleItems()` is public.
- `toggleAllVisible()` chooses every visible enabled item of a multiple select component.
- If all of them are already chosen, `toggleAllVisible()` unchooses them instead.
- `hideChosenRows` removes chosen rows from the popup list.
- `createHighlightedTextEl()` marks the match of the query in a row.
- `gatherGroups` gathers the items of a group when they are not next to each other.
- `gatherItemsByGroupKey()` gathers a list the same way.
- AngularJS: `ll-highlight` and `ll-hide-chosen-rows`.
- The constructors take a third argument, `subclassSettings`, for the settings of a subclass.
- The settings type is a type parameter, `S`, so a subclass can extend it.
- AngularJS: the ui-select bridge maps `remove-selected` onto `hideChosenRows`.

### Changed

- Groups are gathered by default.

### Fixed

- The popup clamps against the visual viewport.

### Breaking

- `createTriggerArrowContentElFn` receives a renamed state field.
- That field `isOpen` is now `isOpened`.
- The protected field `isOpen` is gone. A subclass reads `isOpened()`.

## 0.0.4

### Added

- The popup uses the top layer through the Popover API where the browser supports it.
- `createFilledCheckboxSvgEl` draws a filled checkbox.
- AngularJS: `ll-item-content-fn` and `ll-trigger-content-fn`.
- AngularJS: `ll-tag-content-fn` and `ll-tag-remove-button-content-fn`.
- AngularJS: `ll-label-el` and `ll-filter-fn`.
- AngularJS: the directive controller offers `instance()`.

### Changed

- The default `popupWidthPolicy` is `'fit-content'`, like a native select.
- The bootstrap-3 and bootstrap-4 themes draw tags in the light tint of their alerts.

### Breaking

- `selectAllRow` is renamed `chooseAllRow`.
- The translation key `selectAllRowLabel` is renamed `chooseAllRowText`.
- `createSelectAllRowContentElFn` is renamed `createChooseAllRowContentElFn`.
- `groupKeyToLabelFn` is renamed `groupKeyToStringFn`.
- The protected `groupKeyToLabel` is renamed `groupKeyToString`.
- The protected `createSelectAllRowContentEl` is renamed `createChooseAllRowContentEl`.
- The class map entry `selectAllRowClass` is renamed `chooseAllRowClass`.
- The CSS class `llselect-select-all-row` is renamed `llselect-choose-all-row`.
- `createCheckboxSvgEl` is renamed `createOutlinedCheckboxSvgEl`.
- `createCheckSvgEl` is renamed `createCheckmarkSvgEl`.
- AngularJS: `ll-select-all-row` is renamed `ll-choose-all-row`.
- AngularJS: in the ui-select bridge, `ll-label` is renamed `ll-item-text`.
- AngularJS: the slots of the ui-select bridge are renamed `ui-llselect-match` and `ui-llselect-choices`.

## 0.0.3

### Added

- AngularJS: the arrow defaults to the chevron. `ll-arrow="none"` turns it off.
- AngularJS: rows of a multiple select component show checkbox icons by default. `ll-checkboxes="false"` turns them off.

### Breaking

- `searchable` is renamed `filterable`.
- The names of the input change from `search` to `filter`. This covers its translation keys, its class map entries and its CSS class.
- AngularJS: `ll-searchable` is renamed `ll-filterable`.

## 0.0.2

### Added

- `labelEl` connects a label element. A click on the label focuses the trigger.
- `setUiTranslationPack()` swaps the translation pack after construction.

### Breaking

- The setting `texts` is renamed `uiTranslationPack`.
- `getTexts()` is renamed `getUiTranslationPack()`.
- The type `LLSelectTexts` is renamed `LLSelectUiTranslationPack`.
- `textsByLocale` is renamed `uiTranslationPackByLocale`.
- `LLSELECT_VERSION` is renamed `version`.

## 0.0.1

The first version.

- `LLSelectSingle` and `LLSelectMultiple` build a select component on a root element.
- Items can be any JavaScript value, such as numbers or objects.
- A search input filters the items, through `searchable` and `filterFn`.
- Items can be disabled one by one, and groups work like `<optgroup>`.
- A multiple select component shows a count or tags.
- Render functions replace the content of rows, the trigger and tags.
- Translation packs cover many languages, and the layout follows `dir` for right-to-left text.
- Five themes: vanilla, bootstrap-3, bootstrap-4, bootstrap-5 and tailwind.
- AngularJS: the directive `llselect-single` builds a single select component for `ng-model`.
- AngularJS: the directive `llselect-multiple` builds a multiple select component for `ng-model`.
- AngularJS: `ui-llselect` takes the markup of ui-select.
