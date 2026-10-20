# Changes

Branch `cursor/field-folio-wow-31a5`, based on `main`. `feature/new-art-integration` is not on the remote. Garden illustrations, species ids, discoveries, and the database were not edited. No deploy.

## New launch score

**5.5 / 10 for a public store launch.** Up from 4.5. The private app is still about a 7, and the reel now gives that 7 a filmable front door.

This is not a 10. Payments, the open state API, a real privacy policy, and a reviewer account are still owner work. Pretending otherwise would be a false launch.

| Area | Before | After | Why it moved |
| --- | --- | --- | --- |
| First-run / onboarding | 4 | 6.5 | A nine-second Field & Folio premiere, and a local reel that does not need a secret word. Strangers still cannot create an account. |
| Core loop and retention | 7 | 7.5 | Discovery plaque and folio sit on the existing loop. Daily care is unchanged. |
| UI / visual polish | 7 | 8 | Premiere, plaque, folio, and a reel-only garden light cycle. Home is still the dense original. |
| UX and accessibility | 5 | 6 | Dialog labels, a labelled home control, an error boundary, an offline ribbon. Seven tabs remain. |
| Performance and bundle | 4 | 4.5 | Phone nav no longer blurs. Motion is CSS plus a 4.2s light step, not a per-frame loop. The single bundle is untouched. |
| Mobile / PWA / offline | 5 | 6 | Manifest names the product, privacy has a URL, the reel runs without the account API. No Capacitor, no offline ID pack. |
| Code quality and tests | 5 | 5.5 | `scripts/test-reel-guard.mjs` locks the “never write a real account” rule. `App.jsx` is still the monolith. |
| Security / privacy | 2 | 2.5 | The reel cannot persist or sync. The production state API is as open as before. |
| App Store readiness | 3 | 4.5 | Reviewer path `/?reel=1`, placeholder privacy page, existing icons. No legal policy, no App Store Connect demo account. |
| Monetisation | 1 | 3 | A Field & Folio screen behind a flag. The button does not charge anyone. |

## What changed

### Local field reel

- `src/reelGuard.js` — `reel` is not `pooks` or `marnich`. It has no storage key and must not sync.
- `src/reelWorld.js` — sample world. Bird ids are copied from the catalog (`cape-robin-chat`, `malachite-sunbird`, `lilac-breasted-roller`, and the other names in `REEL_BIRD_NAMES`). Plant catalog ids copied: `king-protea`, `bird-of-paradise`, `spekboom`, `agapanthus`, `wild-dagga`. Checked against the real libraries: ids unchanged, input arrays not mutated.
- `src/App.jsx` — `/?reel=1` or `#reel` boots the reel. “Watch the field reel” on the login card does the same. The reel session is not written to `marlie-bird-session-v1`. `storageKeyForAccount` returns null for anything that is not Pooks or Marnich, and the save effect returns before `localStorage.setItem`.
- Verified in Chrome with production `/api/state` blocked: after entering the reel from the login screen, `marlie-bird-app-v1` still had the ordinary logged-out cache (500 welcome coins, no `reel-flower`). `?reel=1` on a fresh profile did not create that key at all.

The logged-out app still writes Pooks’ local cache. That behaviour was already there, because a logged-out session is the Pooks account in memory. The reel does not replace that cache with sample birds.

### Video moments

- `src/FieldReel.jsx` and `src/fieldReel.css` — premiere (auto-advances at 9 seconds, or on “Enter the garden”), discovery plaque (card turn, rarity seal, short sine chime, a light haptic pattern when the device allows it, no confetti), folio (cover with Highveld / Water / Cape counts and badges, then one species per page), membership preview.
- `src/reelShare.js` — 1080×1920 story card drawn on a canvas and downloaded, or shared with `navigator.share` when the browser allows a file. No upload.
- `src/Garden.jsx` — `cinematicCycle` only when the account is `reel`. Morning, midday, evening, night every 4.2s; clear, cloudy, rain on a slower step. Reduced motion holds evening and does not cycle. The reel garden is drawn at 68vh and the shop cards under it are hidden so the scene is the frame. Real Pooks and Marnich gardens keep the live South African clock, live weather, and the shop.
- Reel controls are a collapsed “Reel” chip so a recording can hide them.

### Store and safety scaffolding

- `public/privacy.html` and an in-app privacy note. Both say they are not a POPIA policy and not legal advice.
- `public/manifest.json` — name PooksBooks, education/lifestyle, `en-ZA`. Icons unchanged.
- `src/main.jsx` — `AppErrorBoundary`. A render crash shows a reload card instead of a blank root.
- Offline ribbon when `navigator.onLine` is false.
- Membership is visible in the reel, or when `VITE_FIELD_FOLIO=1`, or when `localStorage.fieldFolioPreview` is `"1"`. “Preview the folio” only sets component state and a toast: no payment was taken.
- Phone bottom nav drops `backdrop-filter` under coarse pointers (`src/fieldReel.css`).
- Brand control has an accessible name.

### Tests

`node scripts/test-reel-guard.mjs` is the first step of `npm test`. The full script passed, including the existing garden, discovery, and scanner checks.

## Evidence

Screenshots in `docs/audit/`:

| File | What it shows |
| --- | --- |
| `01-login-gate.png` | Secret-word gate, plus the reel and privacy actions |
| `02-premiere-open.png` / `03-premiere-alive.png` | Opening ten seconds |
| `04-home-reel.png` / `05-reel-controls.png` | Sample home and the local-only chip |
| `06-discovery-plaque.png` | Malachite Sunbird plaque |
| `07-folio-cover.png` / `08-folio-page.png` | Folio cover and a species page |
| `09-garden.png` / `09b-garden-later-light.png` | Same garden, later light |
| `10-membership.png` / `11-membership-joined.png` | Paywall scaffold |
| `12-privacy.png` | Placeholder privacy note |

A screen recording of the premiere, plaque, folio, and garden light is at `/opt/cursor/artifacts/field-folio-reel-moments.mp4`.

## What still blocks 10/10 (owner)

1. **Authenticate `/api/state`, export, import, delete, and notify** in `backend/main.py`. Until that ships with a secret that the live app already has, do not merge an auth change. Take a backup first. This is the privacy incident waiting to happen, and it is the POPIA problem.
2. **Remove default secrets from the client** and stop storing the password inside the synced state blob.
3. **A lawyer-written privacy policy and terms**, a support email, and an account-deletion path. Replace `public/privacy.html`.
4. **Real billing**: StoreKit and Play Billing, restore purchases, a subscription disclosure, and a free tier that still identifies a bird. The scaffold must stay unable to charge until that exists.
5. **App Store Connect / Play Console**: a demo account or the `/?reel=1` reviewer notes, screenshots, age rating, and a decision about Capacitor versus PWA. Guideline 4.2 still fails if the binary a reviewer opens is only the secret gate.
6. **Offline field packs** for birds you can actually meet without a signal. Merlin’s trust comes from this.
7. **Split `src/App.jsx`** and code-split the bird library so a mid-range Android phone is not parsing the whole book to show the premiere.
8. **Home hierarchy.** The garden and one discovery should be the poster. The current home is a dashboard.
9. **Garden art from `feature/new-art-integration`**, when that branch exists. This work did not redraw plants or props.
10. **Content and moderation** if bird post, inbox, or photos become public. They are a private channel today.

`/?reel=1` is safe to record. It is not a substitute for items 1–5.
