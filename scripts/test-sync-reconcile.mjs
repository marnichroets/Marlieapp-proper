// Tests the auto-adopt decision (shouldAdoptRemote) used by the sync poll.
// Run: node scripts/test-sync-reconcile.mjs
import assert from 'node:assert'
import { shouldAdoptRemote } from '../src/syncReconcile.js'

const state = { featherCoins: 1 }
let n = 0
const ok = (name, cond) => { assert(cond, 'FAILED: ' + name); console.log('  ✓', name); n++ }

// Backend moved ahead of us and we have no local edits -> adopt (the fix case).
ok('newer remote, no unsaved edits -> adopt',
  shouldAdoptRemote({ state, version: 27 }, 26, false) === true)

// We just wrote it (same version) -> do not adopt our own write back.
ok('same version -> no adopt',
  shouldAdoptRemote({ state, version: 26 }, 26, false) === false)

// Backend is behind us -> no adopt.
ok('older remote -> no adopt',
  shouldAdoptRemote({ state, version: 25 }, 26, false) === false)

// Never clobber genuine unsaved local edits, even if the backend moved.
ok('newer remote but unsaved local edits -> no adopt',
  shouldAdoptRemote({ state, version: 30 }, 26, true) === false)

// Missing / empty remote is ignored (offline-safe).
ok('null remote -> no adopt', shouldAdoptRemote(null, 26, false) === false)
ok('remote without state -> no adopt', shouldAdoptRemote({ version: 99 }, 26, false) === false)

// From a fresh (version 0) base, any saved remote is adopted.
ok('base 0, remote v1 -> adopt', shouldAdoptRemote({ state, version: 1 }, 0, false) === true)

console.log(`\n✅ ALL ${n} SYNC-RECONCILE ASSERTIONS PASSED`)
