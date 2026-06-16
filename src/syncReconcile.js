// Decide whether the active session should adopt a freshly fetched backend state.
//
// The sync is last-write-wins, which means a device sitting on a stale copy can
// overwrite a change made elsewhere (another device, or an admin fix on the
// backend). To prevent that, the active session polls the backend and adopts it
// when the backend has moved AHEAD of the version this session last wrote/adopted
// — i.e. someone else changed it. We never adopt over genuine unsaved local
// edits (that would lose her work); those get saved on the normal debounce and
// will themselves advance the version.
export function shouldAdoptRemote(remote, baseVersion, hasUnsavedLocalEdits) {
  if (!remote || !remote.state) return false
  if (hasUnsavedLocalEdits) return false
  return Number(remote.version) > Number(baseVersion || 0)
}
