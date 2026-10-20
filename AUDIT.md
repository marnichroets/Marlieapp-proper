# PooksBooks audit

Audited on `main` at `466a190` (20 October 2026), before the Field & Folio reel work. The remote has no `feature/new-art-integration` branch, so this reading is of the default branch. No production account was logged in, and no `/api/state` body was saved. Screenshots of the invite gate and the later reel are in `docs/audit/`.

## Score

**4.5 / 10 as a public App Store and Play launch.**

**7 / 10 as the private world it actually is:** a two-person South African field journal with a real garden, a large bird book, and a warm editorial voice.

Those are different products. The code on `main` is the second one wearing the clothes of the first. A stranger opening it today meets a secret word, not a garden. Apple’s Guideline 4.2 (minimum functionality) and a subscription review both assume a reviewer can use the product without knowing the family.

## What was looked at

- Frontend: `src/App.jsx` (~15,600 lines), `src/Garden.jsx`, `src/Greenhouse.jsx`, `src/IntroSequence.jsx`, `src/BotanicalReveal.jsx`, `src/index.css`, `src/App.css`, `public/manifest.json`, `public/sw.js`, `index.html`, `package.json`.
- Backend, read only: `backend/main.py` state, identify, notify, and games routes. No schema or data was touched.
- Tests: the `npm test` script in `package.json`.
- The running app at the login gate (production writes blocked in the browser).

## Competitive review

What “premium” means in the apps people will compare this with. Sources are the public product pages, not a paid teardown.

| App | What makes it feel expensive | What PooksBooks can take from it | Source |
| --- | --- | --- | --- |
| Merlin Bird ID (Cornell Lab) | The first screen is the bird, not an account. Photo ID and Sound ID work offline. “This is my bird!” is one tap into a life list. Explore is “likely near you,” powered by eBird. | The reveal and the life list should be the product. Offline packs are why it feels trustworthy in the field. | [merlinbirds.org](https://www.merlinbirds.org/), [Google Play listing](https://play.google.com/store/apps/details?hl=en&id=com.labs.merlinbirdid.app) (updated 13 Oct 2026) |
| iNaturalist | Trust. A sighting becomes research-grade only with date, place, evidence, and community agreement. The lab has estimated the research-grade set at about 97% accurate. | A luxury guide still has to show uncertainty. A confident wrong name feels cheap. | [iNaturalist help: research grade](https://help.inaturalist.org/en/support/solutions/articles/151000169936-what-is-the-data-quality-assessment-dqa-and-how-do-observations-qualify-to-become-research-grade-), [accuracy experiment](https://www.inaturalist.org/blog/90263) |
| Seek | Camera suggestions on device, badges, challenges, no account required, data stays on the phone. Built so a child can use it. | The first ten seconds can be a camera and a badge, with sharing as an explicit later step. | [iNaturalist help: Seek vs iNaturalist](https://help.inaturalist.org/en/support/solutions/articles/151000169914-what-is-the-difference-between-inaturalist-and-seek-by-inaturalist-) |
| PictureThis | A commercial plant book: one photo, a named card, care, toxicity, a collection. The paywall is the business. The App Store listing is explicit that a trial renews as a subscription. | The card can be the ad. The billing must be StoreKit / Play Billing, with restore, and the free tier must still identify something. | [App Store listing](https://apps.apple.com/ag/app/picturethis-plant-identifier/id1252497129) |
| Pokémon GO | Rarity, proximity, and a catch animation you want to film. The collection is the status object. | A discovery should feel like a catch: one species, one rarity, one sound, then the book updates. | Public game loop; no single page was treated as a spec. |
| Finch | A small bird, a streak that repairs itself, and a home you dress. Plus is optional and the core self-care stays free. The pet is the reason to open the app, not a meter. | Tweety already is this. The public version should lead with her and the garden, and keep the paid tier from gating care. | [finchcare.com/about-finch](https://finchcare.com/about-finch), [Finch new-user guide](https://help.finchcare.com/hc/en-us/articles/42149821015693-New-User-Guide) |
| Duolingo | Immediate feedback, a streak, a character, and a session short enough to finish. The streak is a day-count, which people protect even when it stops measuring learning. | Use a short daily care loop. Do not let the number become the only reason to open the app. | [Mobbin, streak study](https://mobbin.com/blog/streaks-are-about-losing-a-study-of-859-streak-designs) |

The gap is not “add more features.” Merlin, Seek, and PictureThis win the first ten seconds. Finch and Duolingo win the reason to come back tomorrow. PooksBooks already has more loops than a launch needs (garden, greenhouse, Tweety, magazine, bird post, games, inbox, map). It does not have a public first ten seconds, a filmable catch, or a payment system a store will accept.

## Area scores

### First-run and onboarding — 4 / 10

`LoginScreen` in `src/App.jsx` asks for a name and a secret word. There is no account creation, no sample world, and no explanation of the garden. `IntroSequence.jsx` is a real cinematic, but it runs only after a Pooks or Marnich login (`App.jsx`, the `introSeen` early return). A reviewer never sees it.

Default secrets live in the client: `MARNICH_DEFAULT_SECRET` and `buildDefaultState().settings` (`pooksSecret`, `adminSecret`) in `src/App.jsx`.

### Core loop and retention — 7 / 10

This is the strong part. Daily Tweety care windows, streaks, a bird book of hundreds of species (`src/data/saBirdLibrary.js`), plant scanning, a garden that grows from watering (`src/gardenData.js`, `src/Garden.jsx`), greenhouse care, challenges, and a weekly magazine. The loop is real for the two people who can log in.

It is not a public retention loop. Gifts are hidden unless `account === 'marnich'`. There is no push permission story, no widget, and no “come back tomorrow” for a new person.

### UI and visual polish — 7 / 10

`src/index.css` is already a Field & Folio palette: cream paper `#f7f2ea`, pine `#244436` / `#35604a`, terracotta, Fraunces for headings, Inter for text. The garden sky, weather, and visitors in `src/Garden.jsx` are the best surface in the app. Home (`HomePage` in `src/App.jsx`) is dense: many cards, a seven-tab bar, and personal copy. It does not read as a poster in the first second of a Reel.

### UX and accessibility — 5 / 10

There is real care: `prefers-reduced-motion` blocks in `src/App.css`, some `aria` on the inbox and greenhouse, a back button, focus styles on a few controls. Gaps: the brand control was an unlabelled button, many cards are click-only `article`s, the bottom nav is seven items at `0.62rem` (`src/App.css` `.bottom-tab`), and there is no app-level error boundary. A crash in `App` is a blank screen.

### Performance and bundle size — 4 / 10

`package.json` depends only on React. The cost is the app itself. `src/App.jsx` plus `saBirdLibrary.js`, colour maps, and garden/Tweety art ship as one Vite bundle (`vite.config.js` has no manual chunks). `npm run build` was not treated as a launch budget, but the source weight is obvious: `App.jsx` alone is past the size where Babel warns. The service worker (`public/sw.js`) cache-firsts every GET, including API responses if they are same-origin; identification traffic is cross-origin, so that particular cache is less dangerous, but a stale shell is still easy to keep. `backdrop-filter: blur(20px)` on `.bottom-nav` is a known mid-range Android cost.

### Mobile readiness — 5 / 10

`index.html` has a viewport, `viewport-fit=cover`, and a manifest. `src/main.jsx` registers `public/sw.js`. Icons exist (`public/icon-192.png`, `public/icon-512.png`). There is no Capacitor or native project, no offline species pack, and identification always needs the network (`DEFAULT_BIRD_API_URL` in `src/App.jsx`). Installed PWA is plausible. App Store and Play are not, until there is a native shell or a clear PWA-only decision. Apple will not list a website as an app without a wrapper, and a wrapper of an invite gate fails review.

### Code quality and tests — 5 / 10

`npm test` covers species matching, photo pooling, sync reconcile, quizzes, discovery rules, garden core, greenhouse life, and image safety. Those tests are serious. The UI that users touch lives in `src/App.jsx` and is not component-tested. `storageKeyForAccount` used to send every non-Marnich account to Pooks’ localStorage key, which is how a future “demo” would have destroyed her cache.

### Security and privacy — 2 / 10

This is the launch blocker.

`backend/main.py` exposes, with no authentication:

- `GET/POST/DELETE /api/state`
- `GET /api/state/export`
- `POST /api/state/import` (force-saves over an account)

`VALID_ACCOUNTS` is only `pooks` and `marnich`, but anyone who can call the API can read or replace those saves. CORS allows the production origins and any `https://*.vercel.app` (`get_allowed_origins`). `POST /api/notify` is also unauthenticated. The client stores the password inside the same state blob it syncs (`login()` in `src/App.jsx` compares the secret to `settings.pooksSecret` / `marnichSecret` fetched from `/api/state`).

POPIA: there is no privacy notice, no retention story, and no way for a future user to export or delete themselves without the open admin routes. A personal email is the default notify recipient in `backend/main.py`. Photos for identification are uploaded to the Railway API (`/api/identify-bird`, `/api/identify-plant`).

None of that was changed in this branch. Locking the API without a coordinated secret would lock the live app out of its own saves. It has to be an owner change, with a backup, not a drive-by patch.

### App Store readiness — 3 / 10

Icons and a manifest exist. There is no privacy policy URL, no support URL, no age rating, no screenshots packaged for the stores, and no demo account a reviewer can use. Name strings disagree: `index.html` says “Pooks Birds”; the product people describe is PooksBooks. Guideline 4.2 is a real risk: an invite-only companion app for two named people looks like a personal utility, not a generally useful app, unless the build a reviewer opens is the field guide.

### Monetisation — 1 / 10

Feather coins, the garden shop, and “premium” nest tiers (`src/store.js`, `src/gardenData.js`) are in-world currency. Nothing talks to StoreKit, Play Billing, or a web checkout. There is no restore-purchases path, no subscription disclosure, and no free-tier definition a review team can test. Shipping a paywall that charges outside the stores will be rejected.

## Video test, before

The first frame is the secret-word card (`docs/audit/01-login-gate.png` is the same gate, with the reel button added later). It does not survive three seconds of a muted Reel. The garden would, if anyone could reach it.
