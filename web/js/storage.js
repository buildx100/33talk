/* localStorage throws in Safari private mode. An uncaught throw inside a
   click handler kills the rest of the script, so every access goes through
   here and nowhere else. */

export function get(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

export function set(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}
