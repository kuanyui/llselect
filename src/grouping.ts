// Pure grouping helper, used by LLSelectBase (the `gatherGroups` setting) and
// exported for callers who pre-gather their own data.

/**
 * Stable-bucket `items` so that every group is contiguous, without touching
 * the caller's array.
 *
 * - Groups appear in order of each key's FIRST appearance.
 * - Within a group, items keep their relative order.
 * - Items whose key is `null` (ungrouped) form their own single-item segment
 *   at their walk position; they never merge.
 * - Already-contiguous input is detected in one scan and returned AS-IS (the
 *   input array itself, no copy); otherwise a new array is returned.
 *
 * This is exactly what `LLSelectBase` runs internally while the
 * `gatherGroups` setting is on (the default). Exported for callers who switch
 * `gatherGroups` off and gather once themselves (e.g. ahead of many
 * `setItems` calls on the same data).
 *
 * @param items - the item list to gather
 * @param itemToGroupKeyFn - item to group key; `null` = the item is in no group
 * @param groupKeyCompareFn - key equality; `null` / omitted = strict `===`
 *   (same contract as the `groupKeyCompareFn` setting)
 * @group Grouping
 */
export function gatherItemsByGroupKey<T, GroupKey = string>(
  items: readonly T[],
  itemToGroupKeyFn: (item: T) => GroupKey | null,
  groupKeyCompareFn?: ((a: GroupKey, b: GroupKey) => boolean) | null,
): readonly T[] {
  const eq = groupKeyCompareFn ?? null
  // Seen-key lookup: Map for the default identity (O(1) per item), linear
  // scan over first-seen keys for a custom predicate (a Map cannot key by
  // predicate).
  const seenMap = eq === null ? new Map<GroupKey, true>() : null
  const seenList: GroupKey[] = []
  const hasSeen = (k: GroupKey): boolean => (seenMap !== null ? seenMap.has(k) : seenList.some(s => eq!(s, k)))
  const keyEquals = (a: GroupKey, b: GroupKey): boolean => (eq !== null ? eq(a, b) : a === b)

  // Pass 1, detect only (no per-item allocation): contiguous means every
  // non-null key either equals the previous item's key or was never seen.
  let contiguous = true
  let prevKey: GroupKey | null = null
  for (const item of items) {
    const key = itemToGroupKeyFn(item)
    if (key === null) { prevKey = null; continue }
    if (prevKey !== null && keyEquals(prevKey, key)) { continue }
    if (hasSeen(key)) { contiguous = false; break }
    if (seenMap !== null) { seenMap.set(key, true) } else { seenList.push(key) }
    prevKey = key
  }
  if (contiguous) { return items }

  // Pass 2, rebuild: one bucket per key in first-appearance order; null-key
  // items are their own single-item segment.
  const segments: T[][] = []
  const bucketMap = eq === null ? new Map<GroupKey, T[]>() : null
  const keyedBuckets: { key: GroupKey; bucket: T[] }[] = []
  for (const item of items) {
    const key = itemToGroupKeyFn(item)
    if (key === null) {
      segments.push([item])
      continue
    }
    let bucket = bucketMap !== null ? bucketMap.get(key) : keyedBuckets.find(b => eq!(b.key, key))?.bucket
    if (bucket === undefined) {
      bucket = []
      segments.push(bucket)
      if (bucketMap !== null) { bucketMap.set(key, bucket) } else { keyedBuckets.push({ key, bucket }) }
    }
    bucket.push(item)
  }
  const out: T[] = []
  for (const bucket of segments) { out.push(...bucket) }
  return out
}
