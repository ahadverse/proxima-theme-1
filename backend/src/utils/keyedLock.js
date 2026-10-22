const tails = new Map();

/**
 * Runs `fn` after every earlier call with the same key has finished, so two requests for the same thing (an order being
 * cancelled by a double-click, two staff acting at once) are handled one after the other instead of both reading the old
 * state. Within one server process only — anything that must also hold across several servers has to be atomic in the
 * database as well (see releaseOrderStock).
 */
export async function withLock(key, fn) {
  const previous = tails.get(key) ?? Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  tails.set(key, tail);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  }
}
