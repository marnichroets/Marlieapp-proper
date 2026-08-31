// Shared location-picking UI — search-as-you-type with candidate selection,
// GPS ("use my current location"), and a mandatory confirm step before any
// location is handed back to the caller. Built to be the one trusted place
// for "where is this?" across bird sightings, Bird Post addresses, and (via
// whatever they feed) the Bird Map — see locationEngine.js for the data side.
//
// Deliberately never auto-picks a result: searchPlaces() can return several
// candidates, and even a single candidate still goes through the "Is this
// correct?" card before onChange fires. A caller only ever receives a
// location the human explicitly confirmed.
import { useEffect, useRef, useState } from 'react'
import { searchPlaces, reverseGeocode, getCurrentPosition, GPS_ACCURACY_WARNING_METERS } from './locationEngine'

const SEARCH_DEBOUNCE_MS = 350

function formatCoords(lat, lng) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

// The confirm card is shared between the "picked a search candidate" path
// and the "GPS fix reverse-geocoded" path — same questions, same stakes.
function ConfirmCard({ candidate, accuracyWarning, onConfirm, onReject, showCoordinates }) {
  return (
    <div className="location-confirm">
      {accuracyWarning && (
        <p className="location-accuracy-warning">
          ⚠️ Your location is quite approximate (accurate to ~{Math.round(accuracyWarning)}m).
          Choose a place manually below if you&apos;d like a more accurate sighting location.
        </p>
      )}
      <p className="location-confirm-name">
        📍 {candidate.name || 'Unnamed place'}
        <br />
        <span className="fine-print">
          {candidate.formatted || candidate.country}
          {showCoordinates && (
            <>
              <br />
              {formatCoords(candidate.latitude, candidate.longitude)}
            </>
          )}
        </span>
      </p>
      <p className="fine-print">
        <strong>Is this correct?</strong>
      </p>
      <div className="button-row">
        <button className="primary-btn" type="button" onClick={onConfirm}>
          ✓ Yes, use this
        </button>
        <button className="text-btn" type="button" onClick={onReject}>
          Search for another place
        </button>
      </div>
    </div>
  )
}

export function LocationPicker({
  label = 'Location',
  helperText,
  placeholder = 'Search for a place…',
  value,
  onChange,
  showCoordinates = true,
  gpsButtonLabel = '📍 Use my current location',
}) {
  const [draftQuery, setDraftQuery] = useState('')
  const [candidates, setCandidates] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [pending, setPending] = useState(null) // candidate awaiting explicit confirmation
  const [pendingAccuracyWarning, setPendingAccuracyWarning] = useState(null)
  const [gpsBusy, setGpsBusy] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [editing, setEditing] = useState(!value) // false while an already-saved value is just being shown

  const abortRef = useRef(null)

  // Debounced search — cancels the previous in-flight request so a fast
  // typist never has an old query's results race in over a newer one. The
  // too-short/not-editing case is handled inside the same debounced timer
  // (rather than synchronously in the effect body) so this never triggers
  // the cascading-render footgun of setState-during-effect.
  useEffect(() => {
    if (!editing) return undefined
    const timer = window.setTimeout(async () => {
      const trimmed = draftQuery.trim()
      if (trimmed.length < 3) {
        setCandidates([])
        setSearchError('')
        setSearching(false)
        return
      }
      setSearching(true)
      setSearchError('')
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const results = await searchPlaces(trimmed, { signal: controller.signal })
        setCandidates(results)
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setSearchError(error?.message || 'Could not search for that place.')
          setCandidates([])
        }
      } finally {
        setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draftQuery, editing])

  function pickCandidate(candidate) {
    setPending(candidate)
    setPendingAccuracyWarning(null)
  }

  function confirmPending() {
    if (!pending) return
    onChange({ ...pending, capturedAt: new Date().toISOString() })
    setPending(null)
    setPendingAccuracyWarning(null)
    setDraftQuery('')
    setCandidates([])
    setEditing(false)
  }

  function rejectPending() {
    setPending(null)
    setPendingAccuracyWarning(null)
  }

  async function useCurrentLocation() {
    setGpsBusy(true)
    setGpsError('')
    try {
      const { lat, lng, accuracyMeters } = await getCurrentPosition()
      const located = await reverseGeocode(lat, lng, { accuracyMeters })
      setPending(located)
      setPendingAccuracyWarning(
        accuracyMeters != null && accuracyMeters > GPS_ACCURACY_WARNING_METERS ? accuracyMeters : null,
      )
    } catch (error) {
      setGpsError(error?.message || 'Could not determine your location.')
    } finally {
      setGpsBusy(false)
    }
  }

  if (pending) {
    return (
      <div className="location-picker">
        {label && <h3>{label}</h3>}
        <ConfirmCard
          candidate={pending}
          accuracyWarning={pendingAccuracyWarning}
          onConfirm={confirmPending}
          onReject={rejectPending}
          showCoordinates={showCoordinates}
        />
      </div>
    )
  }

  if (value && !editing) {
    return (
      <div className="location-picker">
        {label && <h3>{label}</h3>}
        <p className="fine-print">
          📍 Saved: {value.name || value.formatted}
          {value.formatted && value.name ? ` — ${value.formatted}` : ''}
          {showCoordinates && (
            <>
              <br />
              {formatCoords(value.latitude, value.longitude)}
            </>
          )}
        </p>
        <button className="text-btn" type="button" onClick={() => setEditing(true)}>
          Change location
        </button>
      </div>
    )
  }

  return (
    <div className="location-picker">
      {label && <h3>{label}</h3>}
      {helperText && <p className="fine-print">{helperText}</p>}
      <button
        className="secondary-btn location-gps-btn"
        type="button"
        onClick={useCurrentLocation}
        disabled={gpsBusy}
      >
        {gpsBusy ? 'Finding you…' : gpsButtonLabel}
      </button>
      {gpsError && <p className="login-error">{gpsError}</p>}
      <input
        value={draftQuery}
        onChange={(event) => setDraftQuery(event.target.value)}
        placeholder={placeholder}
      />
      {searching && <p className="fine-print">Searching…</p>}
      {searchError && <p className="login-error">{searchError}</p>}
      {!searching && !searchError && draftQuery.trim().length >= 3 && candidates.length === 0 && (
        <p className="fine-print">No matches — try a fuller or different search.</p>
      )}
      {candidates.length > 0 && (
        <div className="location-candidates">
          {candidates.map((candidate, index) => (
            <button
              key={`${candidate.latitude},${candidate.longitude},${index}`}
              type="button"
              className="location-candidate"
              onClick={() => pickCandidate(candidate)}
            >
              <span className="location-candidate-name">📍 {candidate.name || 'Unnamed place'}</span>
              <span className="fine-print">{candidate.formatted || candidate.country}</span>
            </button>
          ))}
        </div>
      )}
      {value && (
        <button className="text-btn" type="button" onClick={() => setEditing(false)}>
          Cancel
        </button>
      )}
    </div>
  )
}
