// Plant scanning is a normal Pooks feature. Historical saves may still carry
// the old staged-release flags, so her access must not depend on those fields.
// Marnich's sandbox remains explicitly gated for safe feature testing.
export function plantScannerAvailableForAccount(accountId, settings = {}) {
  if (accountId === 'pooks') return true
  return Boolean(settings.releaseFlags?.plants && settings.plantScanningUnlocked)
}
