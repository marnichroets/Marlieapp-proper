// Species-accurate illustrated SVG bird bodies for the Bird Garden.
//
// Every template below is the SAME idea as TweetyBird (see Tweety.jsx) but
// built as a proper perched-bird silhouette instead of a round blob: a body,
// a separate head, a beak, an eye, a wing, a breast/belly patch, a tail and
// legs — eight independent colour zones. A species doesn't get its own
// drawing; it gets a template (by rough body/beak/tail shape) plus a colour
// map (see birdColourMap.js) that fills these same eight zones. Swap the
// zones and the same template reads as a completely different bird.
//
// Zone shape (used by every template + BIRD_COLOUR_MAP):
//   { head, beak, eye, body, breast, wing, tail, legs } — all CSS colour strings.
//
// `wing` and `breast` are always clipped to the body silhouette (see the
// per-template <clipPath>), so they can never poke outside it no matter how
// the proportions shift between templates.

const INK = '#4d4030' // shared line-art outline colour, not a zone — matches
// the app's warm-charcoal ink family rather than pure black.

function ZoneStyle({ zones }) {
  // Exposed as CSS custom properties so every path below can just say
  // fill="var(--z-head)" etc. — one place sets the palette per instance.
  return {
    '--z-head': zones.head,
    '--z-beak': zones.beak,
    '--z-eye': zones.eye,
    '--z-body': zones.body,
    '--z-breast': zones.breast,
    '--z-wing': zones.wing,
    '--z-tail': zones.tail,
    '--z-legs': zones.legs,
  }
}

function Ground({ kind = 'branch' }) {
  return kind === 'water' ? (
    <rect x="10" y="386" width="600" height="16" rx="8" fill="#9fc3d6" opacity="0.55" />
  ) : (
    <rect x="70" y="378" width="440" height="15" rx="7.5" fill="#a9835b" opacity="0.55" />
  )
}

function ThreeToeFeet({ x1, x2, y = 380 }) {
  return (
    <g stroke="var(--z-legs)" strokeWidth="4" strokeLinecap="round">
      <path d={`M ${x1} ${y} L ${x1 - 24} ${y + 12} M ${x1} ${y} L ${x1} ${y + 16} M ${x1} ${y} L ${x1 + 22} ${y + 10}`} fill="none" />
      <path d={`M ${x2} ${y} L ${x2 - 22} ${y + 11} M ${x2} ${y} L ${x2} ${y + 16} M ${x2} ${y} L ${x2 + 22} ${y + 10}`} fill="none" />
    </g>
  )
}

// ---- 1. songbird-small — compact round body, short thin beak, short tail
// (robin, pipit, flycatcher) ----------------------------------------------
export function SongbirdSmall({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-songbird-small">
          <path d="M 224 214 C 208 172 268 132 328 140 C 384 148 416 192 408 236 C 400 276 356 312 296 312 C 244 312 216 280 212 244 C 210 232 212 222 224 214 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M 224 258 Q 150 236 100 250 Q 148 272 226 278 Z" fill="var(--z-tail)" />
        <path d="M 224 270 Q 140 274 82 296 Q 140 300 226 288 Z" fill="var(--z-tail)" />
        <path d="M 224 282 Q 148 300 108 330 Q 152 322 228 296 Z" fill="var(--z-tail)" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="7" strokeLinecap="round">
        <path d="M 272 300 L 264 380" fill="none" />
        <path d="M 316 298 L 328 380" fill="none" />
      </g>
      <ThreeToeFeet x1={264} x2={328} />
      <path d="M 224 214 C 208 172 268 132 328 140 C 384 148 416 192 408 236 C 400 276 356 312 296 312 C 244 312 216 280 212 244 C 210 232 212 222 224 214 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-songbird-small)">
        <path d="M 244 188 C 276 172 316 180 336 220 C 316 240 276 248 246 234 C 234 216 234 200 244 188 Z" fill="var(--z-wing)" />
        <ellipse cx="330" cy="264" rx="66" ry="48" fill="var(--z-breast)" />
      </g>
      <circle cx="432" cy="176" r="62" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      <path d="M 486 168 L 546 182 L 486 198 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="452" cy="160" r="11" fill="var(--z-eye)" />
      <circle cx="452" cy="160" r="6.5" fill="#1c1712" />
      <circle cx="449.5" cy="157" r="2.1" fill="#fffdf8" />
    </svg>
  )
}

// ---- 2. songbird-crested — songbird-small + a head crest -----------------
// (bulbul, lourie, hoopoe)
export function SongbirdCrested({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-songbird-crested">
          <path d="M 224 214 C 208 172 268 132 328 140 C 384 148 416 192 408 236 C 400 276 356 312 296 312 C 244 312 216 280 212 244 C 210 232 212 222 224 214 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M 224 258 Q 150 236 100 250 Q 148 272 226 278 Z" fill="var(--z-tail)" />
        <path d="M 224 270 Q 140 274 82 296 Q 140 300 226 288 Z" fill="var(--z-tail)" />
        <path d="M 224 282 Q 148 300 108 330 Q 152 322 228 296 Z" fill="var(--z-tail)" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="7" strokeLinecap="round">
        <path d="M 272 300 L 264 380" fill="none" />
        <path d="M 316 298 L 328 380" fill="none" />
      </g>
      <ThreeToeFeet x1={264} x2={328} />
      <path d="M 224 214 C 208 172 268 132 328 140 C 384 148 416 192 408 236 C 400 276 356 312 296 312 C 244 312 216 280 212 244 C 210 232 212 222 224 214 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-songbird-crested)">
        <path d="M 244 188 C 276 172 316 180 336 220 C 316 240 276 248 246 234 C 234 216 234 200 244 188 Z" fill="var(--z-wing)" />
        <ellipse cx="330" cy="264" rx="66" ry="48" fill="var(--z-breast)" />
      </g>
      <circle cx="432" cy="176" r="62" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      {/* crest: a fan of pointed feathers off the crown, same zone as head */}
      <g fill="var(--z-head)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M 396 126 C 388 100 396 78 414 64 C 408 90 410 110 416 128 Z" />
        <path d="M 414 120 C 412 92 424 70 444 58 C 432 84 428 104 430 122 Z" />
        <path d="M 432 124 C 436 98 452 80 472 72 C 456 94 448 112 446 128 Z" />
      </g>
      <path d="M 486 168 L 546 182 L 486 198 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="452" cy="160" r="11" fill="var(--z-eye)" />
      <circle cx="452" cy="160" r="6.5" fill="#1c1712" />
      <circle cx="449.5" cy="157" r="2.1" fill="#fffdf8" />
    </svg>
  )
}

// ---- 3. weaver — stocky, short thick conical beak, medium tail ----------
// (weaver, bishop, finch, canary, sparrow)
export function Weaver({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-weaver">
          <path d="M 218 225 C 210 178 270 138 320 140 C 378 142 420 178 420 224 C 420 268 380 306 316 306 C 258 306 220 272 216 240 C 214 232 216 228 218 225 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M 214 250 Q 150 234 96 244 Q 148 266 216 272 Z" fill="var(--z-tail)" />
        <path d="M 214 262 Q 130 264 70 288 Q 132 292 216 282 Z" fill="var(--z-tail)" />
        <path d="M 214 276 Q 140 292 100 320 Q 146 314 218 290 Z" fill="var(--z-tail)" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="8" strokeLinecap="round">
        <path d="M 276 296 L 268 380" fill="none" />
        <path d="M 322 294 L 334 380" fill="none" />
      </g>
      <ThreeToeFeet x1={268} x2={334} />
      <path d="M 218 225 C 210 178 270 138 320 140 C 378 142 420 178 420 224 C 420 268 380 306 316 306 C 258 306 220 272 216 240 C 214 232 216 228 218 225 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-weaver)">
        <path d="M 236 192 C 266 178 302 186 322 222 C 302 240 266 246 238 234 C 228 216 228 202 236 192 Z" fill="var(--z-wing)" />
        <ellipse cx="322" cy="258" rx="62" ry="46" fill="var(--z-breast)" />
      </g>
      <circle cx="420" cy="168" r="56" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      <path d="M 470 160 L 500 172 L 470 188 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="440" cy="154" r="10" fill="var(--z-eye)" />
      <circle cx="440" cy="154" r="6" fill="#1c1712" />
      <circle cx="437.5" cy="151" r="2" fill="#fffdf8" />
    </svg>
  )
}

// ---- 4. sunbird — slim elegant body, long thin curved beak, long tail ---
// (sunbird, sugarbird)
export function Sunbird({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-sunbird">
          <path d="M 230 230 C 224 196 268 168 316 172 C 360 176 388 206 384 236 C 380 262 350 286 306 286 C 266 286 236 266 230 248 C 228 242 228 236 230 230 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M 230 246 Q 194 240 168 246 Q 194 254 232 258 Z" fill="var(--z-tail)" />
      </g>
      <g fill="var(--z-tail)" opacity="0.95">
        <path d="M 225 248 C 168 250 96 258 36 268 C 98 254 170 248 226 244 Z" stroke={INK} strokeWidth="1.5" />
        <path d="M 225 254 C 168 258 96 270 38 282 C 98 264 170 256 226 250 Z" stroke={INK} strokeWidth="1.5" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="5" strokeLinecap="round">
        <path d="M 280 280 L 274 380" fill="none" />
        <path d="M 314 278 L 322 380" fill="none" />
      </g>
      <ThreeToeFeet x1={274} x2={322} />
      <path d="M 230 230 C 224 196 268 168 316 172 C 360 176 388 206 384 236 C 380 262 350 286 306 286 C 266 286 236 266 230 248 C 228 242 228 236 230 230 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-sunbird)">
        <path d="M 250 206 C 276 196 302 202 314 228 C 298 242 272 246 252 236 C 244 224 244 214 250 206 Z" fill="var(--z-wing)" />
        <ellipse cx="304" cy="252" rx="52" ry="36" fill="var(--z-breast)" />
      </g>
      <circle cx="398" cy="186" r="42" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      {/* long thin decurved bill */}
      <path d="M 436 182 C 470 178 510 186 536 200 C 512 196 480 196 456 200 C 446 202 440 196 436 182 Z"
        fill="var(--z-beak)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="410" cy="172" r="8" fill="var(--z-eye)" />
      <circle cx="410" cy="172" r="4.6" fill="#1c1712" />
      <circle cx="408" cy="170" r="1.6" fill="#fffdf8" />
    </svg>
  )
}

// ---- 5. kingfisher — big head, long straight heavy beak, short tail ----
// (kingfisher, bee-eater)
export function Kingfisher({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-kingfisher">
          <path d="M 244 244 C 234 206 282 178 328 182 C 368 186 396 214 392 246 C 388 274 356 300 306 300 C 264 300 240 278 236 256 C 235 250 236 248 244 244 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <path d="M 244 278 Q 214 272 198 278 Q 214 286 246 290 Z" fill="var(--z-tail)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g stroke="var(--z-legs)" strokeWidth="6" strokeLinecap="round">
        <path d="M 284 296 L 280 380" fill="none" />
        <path d="M 312 294 L 318 380" fill="none" />
      </g>
      <ThreeToeFeet x1={280} x2={318} />
      <path d="M 244 244 C 234 206 282 178 328 182 C 368 186 396 214 392 246 C 388 274 356 300 306 300 C 264 300 240 278 236 256 C 235 250 236 248 244 244 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-kingfisher)">
        <path d="M 256 214 C 286 200 320 208 338 242 C 320 260 286 266 258 254 C 248 238 248 224 256 214 Z" fill="var(--z-wing)" />
        <ellipse cx="318" cy="270" rx="58" ry="42" fill="var(--z-breast)" />
      </g>
      <circle cx="366" cy="192" r="80" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      <path d="M 446 178 L 556 194 L 446 212 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="400" cy="168" r="13" fill="var(--z-eye)" />
      <circle cx="400" cy="168" r="7.5" fill="#1c1712" />
      <circle cx="397" cy="164" r="2.4" fill="#fffdf8" />
    </svg>
  )
}

// ---- 6. barbet — stocky compact, heavy beak, short tail, big head ------
// (barbet, tinkerbird)
export function Barbet({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-barbet">
          <path d="M 222 222 C 212 180 268 144 324 148 C 380 152 414 188 410 226 C 406 262 368 298 306 298 C 252 298 220 270 216 242 C 214 234 216 228 222 222 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M 222 250 Q 190 244 174 250 Q 190 258 224 262 Z" fill="var(--z-tail)" />
        <path d="M 222 260 Q 186 266 160 282 Q 192 286 226 272 Z" fill="var(--z-tail)" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="8" strokeLinecap="round">
        <path d="M 274 292 L 268 380" fill="none" />
        <path d="M 318 290 L 328 380" fill="none" />
      </g>
      <ThreeToeFeet x1={268} x2={328} />
      <path d="M 222 222 C 212 180 268 144 324 148 C 380 152 414 188 410 226 C 406 262 368 298 306 298 C 252 298 220 270 216 242 C 214 234 216 228 222 222 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-barbet)">
        <path d="M 240 196 C 270 182 306 190 326 224 C 306 242 270 248 242 236 C 232 218 232 204 240 196 Z" fill="var(--z-wing)" />
        <ellipse cx="320" cy="258" rx="60" ry="44" fill="var(--z-breast)" />
      </g>
      <circle cx="404" cy="178" r="64" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      <path d="M 462 168 L 510 182 L 462 198 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="424" cy="162" r="11" fill="var(--z-eye)" />
      <circle cx="424" cy="162" r="6.4" fill="#1c1712" />
      <circle cx="421.5" cy="159" r="2.1" fill="#fffdf8" />
    </svg>
  )
}

// ---- 7. longtail — slim body, very long trailing tail feathers ---------
// (mousebird, whydah, paradise flycatcher)
export function Longtail({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-longtail">
          <path d="M 234 222 C 226 192 264 168 306 172 C 344 176 368 202 364 228 C 360 252 334 272 296 272 C 262 272 236 254 232 238 C 230 232 230 228 234 222 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <path d="M 234 236 Q 206 230 190 236 Q 206 244 236 248 Z" fill="var(--z-tail)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <g fill="var(--z-tail)">
        <path d="M 230 238 C 160 244 80 254 10 270 C 78 250 158 238 232 232 Z" stroke={INK} strokeWidth="1.5" />
        <path d="M 230 244 C 160 252 80 266 12 286 C 78 260 158 246 232 238 Z" stroke={INK} strokeWidth="1.5" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="5" strokeLinecap="round">
        <path d="M 278 266 L 272 380" fill="none" />
        <path d="M 306 264 L 312 380" fill="none" />
      </g>
      <ThreeToeFeet x1={272} x2={312} />
      <path d="M 234 222 C 226 192 264 168 306 172 C 344 176 368 202 364 228 C 360 252 334 272 296 272 C 262 272 236 254 232 238 C 230 232 230 228 234 222 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-longtail)">
        <path d="M 244 196 C 266 188 288 192 298 214 C 284 226 262 230 246 222 C 240 212 240 204 244 196 Z" fill="var(--z-wing)" />
        <ellipse cx="292" cy="232" rx="42" ry="30" fill="var(--z-breast)" />
      </g>
      <circle cx="340" cy="184" r="40" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      <path d="M 374 180 L 406 190 L 374 200 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="352" cy="172" r="7" fill="var(--z-eye)" />
      <circle cx="352" cy="172" r="4" fill="#1c1712" />
      <circle cx="350.3" cy="170" r="1.5" fill="#fffdf8" />
    </svg>
  )
}

// ---- 8. swallow — slim body, forked tail, pointed wings, tiny beak -----
// (swallow, swift, martin)
export function Swallow({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-swallow">
          <path d="M 240 216 C 234 190 268 168 304 172 C 338 176 360 198 356 222 C 352 244 328 262 294 262 C 264 262 240 248 236 234 C 234 228 234 222 240 216 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <g fill="var(--z-tail)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M 234 232 L 160 220 L 200 240 Z" />
        <path d="M 234 238 L 160 258 L 200 244 Z" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="4" strokeLinecap="round">
        <path d="M 272 258 L 268 380" fill="none" />
        <path d="M 294 258 L 298 380" fill="none" />
      </g>
      <ThreeToeFeet x1={268} x2={298} />
      <path d="M 240 216 C 234 190 268 168 304 172 C 338 176 360 198 356 222 C 352 244 328 262 294 262 C 264 262 240 248 236 234 C 234 228 234 222 240 216 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {/* pointed swept-back wing — deliberately NOT clipped to the body, so
          the tip can reach past it the way a folded swallow wing does */}
      <path d="M 250 200 L 340 222 L 246 232 Z" fill="var(--z-wing)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <g clipPath="url(#clip-swallow)">
        <ellipse cx="296" cy="226" rx="38" ry="26" fill="var(--z-breast)" />
      </g>
      <circle cx="334" cy="182" r="34" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      <path d="M 362 180 L 376 186 L 362 192 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="344" cy="176" r="6" fill="var(--z-eye)" />
      <circle cx="344" cy="176" r="3.4" fill="#1c1712" />
      <circle cx="342.6" cy="174.4" r="1.3" fill="#fffdf8" />
    </svg>
  )
}

// ---- 9. dove — plump rounded body, small head, medium tail -------------
// (dove, pigeon, guineafowl)
export function Dove({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-dove">
          <path d="M 212 222 C 198 172 262 132 328 138 C 390 144 428 190 420 236 C 412 278 366 318 300 318 C 244 318 214 284 210 246 C 208 234 210 224 212 222 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M 214 262 Q 150 246 100 258 Q 148 282 218 288 Z" fill="var(--z-tail)" />
        <path d="M 214 274 Q 138 280 82 302 Q 140 308 220 298 Z" fill="var(--z-tail)" />
        <path d="M 214 286 Q 148 306 108 334 Q 154 328 222 308 Z" fill="var(--z-tail)" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="7" strokeLinecap="round">
        <path d="M 268 312 L 262 380" fill="none" />
        <path d="M 308 310 L 316 380" fill="none" />
      </g>
      <ThreeToeFeet x1={262} x2={316} />
      <path d="M 212 222 C 198 172 262 132 328 138 C 390 144 428 190 420 236 C 412 278 366 318 300 318 C 244 318 214 284 210 246 C 208 234 210 224 212 222 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-dove)">
        <path d="M 240 198 C 272 184 310 192 330 226 C 310 246 272 252 244 240 C 232 222 232 208 240 198 Z" fill="var(--z-wing)" />
        <ellipse cx="318" cy="268" rx="64" ry="50" fill="var(--z-breast)" />
      </g>
      <circle cx="400" cy="172" r="46" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      <path d="M 436 166 L 462 176 L 436 186 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="412" cy="160" r="9" fill="var(--z-eye)" />
      <circle cx="412" cy="160" r="5.2" fill="#1c1712" />
      <circle cx="410" cy="158" r="1.8" fill="#fffdf8" />
    </svg>
  )
}

// ---- 10. waterbird — larger body, long legs, longer neck ---------------
// (plover, lapwing, heron, duck, goose, cormorant, gull)
export function Waterbird({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-waterbird">
          <path d="M 204 208 C 190 160 258 124 328 132 C 392 140 432 186 424 234 C 416 276 366 314 296 314 C 236 314 202 278 198 240 C 196 226 198 216 204 208 Z" />
        </clipPath>
      </defs>
      {ground && <Ground kind="water" />}
      <path d="M 206 246 Q 168 240 140 250 Q 168 262 210 262 Z" fill="var(--z-tail)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g stroke="var(--z-legs)" strokeWidth="7" strokeLinecap="round">
        <path d="M 266 306 L 258 392" fill="none" />
        <path d="M 326 304 L 336 392" fill="none" />
      </g>
      <ThreeToeFeet x1={258} x2={336} y={390} />
      {/* long neck reaching up to the head — same zone/colour as the back */}
      <path d="M 340 172 C 356 132 380 96 402 66 C 420 78 424 96 414 124 C 400 158 380 184 362 206 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M 204 208 C 190 160 258 124 328 132 C 392 140 432 186 424 234 C 416 276 366 314 296 314 C 236 314 202 278 198 240 C 196 226 198 216 204 208 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-waterbird)">
        <path d="M 228 238 C 260 222 300 230 322 268 C 300 290 258 296 232 282 C 220 262 220 248 228 238 Z" fill="var(--z-wing)" />
        <ellipse cx="306" cy="278" rx="70" ry="54" fill="var(--z-breast)" />
      </g>
      <circle cx="416" cy="60" r="40" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      <path d="M 456 52 L 512 60 L 456 70 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="430" cy="48" r="7.5" fill="var(--z-eye)" />
      <circle cx="430" cy="48" r="4.3" fill="#1c1712" />
      <circle cx="428.2" cy="46.2" r="1.6" fill="#fffdf8" />
    </svg>
  )
}

// ---- 11. raptor — broad body, hooked beak, broad tail, strong legs -----
// (eagle, hawk, kestrel, owl)
export function Raptor({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-raptor">
          <path d="M 196 210 C 182 158 254 116 330 124 C 398 132 442 182 434 234 C 426 282 372 326 296 326 C 230 326 194 284 190 240 C 188 224 190 214 196 210 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M 196 262 Q 160 250 130 258 Q 160 278 200 286 Z" fill="var(--z-tail)" />
        <path d="M 196 272 Q 150 268 110 282 Q 152 292 200 296 Z" fill="var(--z-tail)" />
        <path d="M 196 282 Q 156 290 122 312 Q 160 310 202 304 Z" fill="var(--z-tail)" />
        <path d="M 196 290 Q 166 306 144 332 Q 172 320 204 310 Z" fill="var(--z-tail)" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="11" strokeLinecap="round">
        <path d="M 258 316 L 250 380" fill="none" />
        <path d="M 314 314 L 324 380" fill="none" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="5" strokeLinecap="round">
        <path d="M 250 380 C 232 388 220 396 210 406 M 250 380 L 250 400 M 250 380 C 268 388 280 396 290 406" fill="none" />
        <path d="M 324 380 C 306 388 294 396 284 406 M 324 380 L 324 400 M 324 380 C 342 388 354 396 364 406" fill="none" />
      </g>
      <path d="M 196 210 C 182 158 254 116 330 124 C 398 132 442 182 434 234 C 426 282 372 326 296 326 C 230 326 194 284 190 240 C 188 224 190 214 196 210 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-raptor)">
        <path d="M 212 196 C 254 178 306 188 332 232 C 306 258 254 266 218 250 C 204 226 204 208 212 196 Z" fill="var(--z-wing)" />
        <ellipse cx="300" cy="268" rx="76" ry="58" fill="var(--z-breast)" />
      </g>
      <circle cx="386" cy="168" r="58" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      {/* brow ridge — the fixed "glare", not a mapped zone */}
      <path d="M 392 140 Q 406 128 420 140" stroke="#2b2117" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* hooked bill */}
      <path d="M 440 158 C 468 152 492 158 508 172 C 492 168 472 172 456 182 C 450 186 442 182 440 158 Z"
        fill="var(--z-beak)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="406" cy="150" r="11" fill="var(--z-eye)" />
      <circle cx="406" cy="150" r="6.4" fill="#1c1712" />
      <circle cx="403.5" cy="147" r="2.1" fill="#fffdf8" />
    </svg>
  )
}

// ---- 12. starling — medium sleek body, straight medium beak, medium tail
// (starling, myna, oxpecker, shrike)
export function Starling({ zones, size = 160, ground = true }) {
  return (
    <svg viewBox="0 0 620 460" style={{ width: size, height: size * (460 / 620), ...ZoneStyle({ zones }) }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-starling">
          <path d="M 222 216 C 210 176 268 140 326 146 C 382 152 416 192 410 234 C 404 272 362 306 300 306 C 246 306 218 276 214 242 C 212 232 214 224 222 216 Z" />
        </clipPath>
      </defs>
      {ground && <Ground />}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M 222 254 Q 158 238 106 250 Q 156 272 224 278 Z" fill="var(--z-tail)" />
        <path d="M 222 266 Q 148 270 92 292 Q 150 298 226 288 Z" fill="var(--z-tail)" />
      </g>
      <g stroke="var(--z-legs)" strokeWidth="7" strokeLinecap="round">
        <path d="M 270 300 L 262 380" fill="none" />
        <path d="M 314 298 L 324 380" fill="none" />
      </g>
      <ThreeToeFeet x1={262} x2={324} />
      <path d="M 222 216 C 210 176 268 140 326 146 C 382 152 416 192 410 234 C 404 272 362 306 300 306 C 246 306 218 276 214 242 C 212 232 214 224 222 216 Z"
        fill="var(--z-body)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g clipPath="url(#clip-starling)">
        <path d="M 240 192 C 270 178 306 186 326 220 C 306 240 270 246 244 234 C 232 216 232 202 240 192 Z" fill="var(--z-wing)" />
        <ellipse cx="316" cy="258" rx="60" ry="44" fill="var(--z-breast)" />
      </g>
      <circle cx="414" cy="178" r="56" fill="var(--z-head)" stroke={INK} strokeWidth="3" />
      <path d="M 462 170 L 512 182 L 462 196 Z" fill="var(--z-beak)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="432" cy="164" r="10" fill="var(--z-eye)" />
      <circle cx="432" cy="164" r="5.8" fill="#1c1712" />
      <circle cx="429.6" cy="161.4" r="2" fill="#fffdf8" />
    </svg>
  )
}

// Not exported — react-refresh only wants component exports from a file
// like this. GardenBird (below) is the only thing other modules need.
const BIRD_TEMPLATES = {
  'songbird-small': SongbirdSmall,
  'songbird-crested': SongbirdCrested,
  weaver: Weaver,
  sunbird: Sunbird,
  kingfisher: Kingfisher,
  barbet: Barbet,
  longtail: Longtail,
  swallow: Swallow,
  dove: Dove,
  waterbird: Waterbird,
  raptor: Raptor,
  starling: Starling,
}

// Renders the right template for a species, filled with its colour zones.
// Falls back to songbird-small if a template name doesn't match (should not
// happen once every species in BIRD_COLOUR_MAP is templated correctly).
// `ground={false}` drops the branch/water line — used by FlyBird, where the
// bird is mid-air and a perch line under it would look like it's dragging a
// twig through the sky.
export function GardenBird({ template, zones, size = 160, ground = true }) {
  const Template = BIRD_TEMPLATES[template] || SongbirdSmall
  return <Template zones={zones} size={size} ground={ground} />
}
