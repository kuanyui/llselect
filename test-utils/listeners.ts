import assert from 'node:assert/strict'

// The arguments of an addEventListener or removeEventListener call.
type ListenerArgs = readonly [type: string, listener: unknown, options?: boolean | EventListenerOptions | undefined]

function captureOf(options: boolean | EventListenerOptions | undefined): boolean {
  return typeof options === 'boolean' ? options : options?.capture === true
}

// A removal matches a listener by its type, its function and its capture flag.
export function isRemovalOf(add: ListenerArgs, remove: ListenerArgs): boolean {
  return remove[0] === add[0] && remove[1] === add[1] && captureOf(remove[2]) === captureOf(add[2])
}

// Fails unless the added listeners have exactly the given types, and each one
// has a matching removal.
export function assertEveryListenerRemoved(
  where: string,
  adds: ReadonlyArray<{ readonly arguments: ListenerArgs }>,
  removes: ReadonlyArray<{ readonly arguments: ListenerArgs }>,
  types: readonly string[],
): void {
  assert.deepEqual(adds.map((add) => add.arguments[0]).sort(), [...types].sort(), where)
  for (const add of adds) {
    assert.ok(removes.some((remove) => isRemovalOf(add.arguments, remove.arguments)), `${where} ${add.arguments[0]}`)
  }
}
