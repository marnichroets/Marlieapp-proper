// Local "field reel" guards. The reel is an in-memory preview for videos and
// store reviewers. It is not an account, and it must never be written to the
// Pooks or Marnich saves (local or remote).

export const REEL_ACCOUNT = 'reel'
export const REAL_ACCOUNTS = ['pooks', 'marnich']

export function isReelAccount(account) {
  return account === REEL_ACCOUNT
}

export function isReelSession(session) {
  return session?.role === REEL_ACCOUNT
}

export function reelRequested(search = '', hash = '') {
  const query = String(search || '')
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)
  if (params.get('reel') === '1' || params.get('demo') === '1') return true
  const cleanHash = String(hash || '')
  return cleanHash === '#reel' || cleanHash === '#demo'
}

export function canPersistAccount(account) {
  return REAL_ACCOUNTS.includes(account)
}

export function canSyncAccount(account) {
  return canPersistAccount(account)
}

// Unknown accounts, including the reel, get no storage key at all.
export function accountStorageKey(account, keys) {
  if (account === 'marnich') return keys?.marnich || null
  if (account === 'pooks') return keys?.pooks || null
  return null
}

export function fieldFolioEnabled({ envFlag = '', storageFlag = '', reel = false } = {}) {
  return Boolean(reel) || String(envFlag || '') === '1' || String(storageFlag || '') === '1'
}

export function storyCardFilename(name) {
  const slug = String(name || 'field')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `pooksbooks-${slug || 'field'}-story.png`
}
