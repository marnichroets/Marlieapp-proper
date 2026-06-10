// Marnich's Secret Market 🛍️ — the rotating wearable shop tab, plus the
// Wardrobe dress-up page. Pure data + maths live in ./market.
import { useEffect, useState } from 'react'
import { TweetyBird } from './Tweety'
import {
  SLOTS,
  WEARABLES,
  wearableById,
  currentMarketItems,
  msUntilRefresh,
  formatCountdown,
  isLastChance,
  isNewInMarket,
  isInMarket,
  marnichPickId,
  ownsWearable,
  isWishlisted,
} from './market'

function slotName(slot) {
  return SLOTS.find((s) => s.id === slot)?.name || slot
}

// ---- a single market item card ---------------------------------------------
function MarketCard({ item, now, wardrobe, coins, isAdmin, isPick, onBuy, onGift, onToggleWishlist, onSetPick }) {
  const owned = ownsWearable(wardrobe, item.id)
  const wished = isWishlisted(wardrobe, item.id)
  const isNew = isNewInMarket(item.id, now)
  const lastChance = isLastChance(now)
  const canAfford = coins >= item.cost
  return (
    <article className={`market-card${item.special ? ' special' : ''}${isPick ? ' pick' : ''}`}>
      <div className="market-badges">
        {isPick && <span className="market-badge pick">Marnich&apos;s pick 💛</span>}
        {isNew && <span className="market-badge new">NEW IN MARKET ✨</span>}
        {lastChance && !owned && <span className="market-badge last">LAST CHANCE ⏳</span>}
        {item.special && <span className="market-badge rare">RARE 💎</span>}
      </div>
      <button
        className={`market-heart${wished ? ' on' : ''}`}
        type="button"
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        onClick={() => onToggleWishlist(item.id)}
      >
        {wished ? '💖' : '🤍'}
      </button>
      <span className="market-emoji" aria-hidden="true">{item.emoji}</span>
      <h4>{item.name}</h4>
      <small className="market-slot">{slotName(item.slot)}</small>
      {owned ? (
        <span className="store-owned">Owned ✅</span>
      ) : isAdmin ? (
        <button className="primary-btn store-buy" type="button" onClick={() => onGift(item)}>Gift 🎁</button>
      ) : (
        <button className="primary-btn store-buy" type="button" disabled={!canAfford} onClick={() => onBuy(item)}>
          {item.cost} 🪙
        </button>
      )}
      {isAdmin && !isPick && (
        <button className="text-btn market-pick-btn" type="button" onClick={() => onSetPick(item.id)}>
          Make pick 💛
        </button>
      )}
    </article>
  )
}

// ---- the Market tab --------------------------------------------------------
export function MarketTab({ wardrobe, coins, isAdmin, marketPick, onBuy, onGift, onToggleWishlist, onSetPick }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const items = currentMarketItems(now)
  const refreshMs = msUntilRefresh(now)
  const pickId = marnichPickId(now, marketPick)
  // "Missed" items — everything in the catalogue that isn't on sale right now.
  // Admins also see admin-only treasures (e.g. the gift box) so they can gift any item.
  const missed = WEARABLES.filter((w) => (isAdmin || !w.adminOnly) && !isInMarket(w.id, now))

  return (
    <>
      <section className="soft-card full-span market-hero">
        <div className="market-hero-art" aria-hidden="true">
          <span className="market-stall">🛍️</span>
          <span className="market-bunting">🎪</span>
        </div>
        <p className="eyebrow">Marnich&apos;s Secret Market 🛍️</p>
        <h2>Six treasures, rotating every 48 hours</h2>
        <p className={`market-countdown${isLastChance(now) ? ' urgent' : ''}`}>
          Market refreshes in <strong>{formatCountdown(refreshMs)}</strong>
        </p>
        <p className="fine-print">When the market refreshes, today&apos;s items are gone until they come around again. 💛</p>
      </section>

      <section className="soft-card full-span">
        <div className="store-grid market-grid">
          {items.map((item) => (
            <MarketCard
              key={item.id}
              item={item}
              now={now}
              wardrobe={wardrobe}
              coins={coins}
              isAdmin={isAdmin}
              isPick={item.id === pickId}
              onBuy={onBuy}
              onGift={onGift}
              onToggleWishlist={onToggleWishlist}
              onSetPick={onSetPick}
            />
          ))}
        </div>
      </section>

      {missed.length > 0 && (
        <section className="soft-card full-span market-missed">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Not in the market right now</p>
              <h3>{isAdmin ? 'Gift any item from the full collection' : "Out of stock — they'll rotate back"}</h3>
            </div>
          </div>
          <div className="store-grid market-grid">
            {missed.map((item) => {
              const owned = ownsWearable(wardrobe, item.id)
              const wished = isWishlisted(wardrobe, item.id)
              return (
                <article className={`market-card missed${owned ? ' owned' : ''}`} key={item.id}>
                  <button
                    className={`market-heart${wished ? ' on' : ''}`}
                    type="button"
                    aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                    onClick={() => onToggleWishlist(item.id)}
                  >
                    {wished ? '💖' : '🤍'}
                  </button>
                  <span className="market-emoji" aria-hidden="true">{item.emoji}</span>
                  <h4>{item.name}</h4>
                  <small className="market-slot">{slotName(item.slot)}</small>
                  {owned ? (
                    <span className="store-owned">Owned ✅</span>
                  ) : isAdmin ? (
                    <button className="primary-btn store-buy" type="button" onClick={() => onGift(item)}>Gift 🎁</button>
                  ) : (
                    <span className="market-soldout">Come back soon</span>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}

// ---- the Wardrobe dress-up page --------------------------------------------
export function WardrobePage({ tweety, isAdmin, onBack, onWear, onToggleWishlist, goToMarket }) {
  const wardrobe = tweety?.wardrobe || { owned: [], worn: {}, wishlist: [] }
  const worn = wardrobe.worn || {}
  const ownedItems = (wardrobe.owned || []).map(wearableById).filter(Boolean)
  const wearing = SLOTS.map((s) => wearableById(worn[s.id])).filter(Boolean)

  return (
    <div className="page-grid wardrobe-page">
      <section className="soft-card full-span wardrobe-hero">
        <button className="text-btn back-btn" type="button" onClick={onBack}>Back</button>
        <p className="eyebrow">Dress {tweety?.name || 'Tweety'} ✨</p>
        <div className="wardrobe-preview">
          <TweetyBird size={150} companion={tweety?.companion} worn={worn} />
        </div>
        {wearing.length > 0 ? (
          <p className="wardrobe-wearing">👗 Wearing: {wearing.map((w) => w.name).join(' + ')}</p>
        ) : (
          <p className="fine-print">Pick a hat, an accessory and an outfit to mix &amp; match. 💛</p>
        )}
      </section>

      {ownedItems.length === 0 ? (
        <section className="soft-card full-span">
          <EmptyWardrobe goToMarket={goToMarket} />
        </section>
      ) : (
        SLOTS.map((slot) => {
          const items = ownedItems.filter((w) => w.slot === slot.id)
          if (items.length === 0) return null
          return (
            <section className="soft-card full-span" key={slot.id}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{slot.emoji} {slot.name}s</p>
                  <h3>Choose one</h3>
                </div>
                {worn[slot.id] && (
                  <button className="text-btn" type="button" onClick={() => onWear(slot.id, worn[slot.id])}>
                    Take off
                  </button>
                )}
              </div>
              <div className="store-grid wardrobe-grid">
                {items.map((item) => {
                  const active = worn[slot.id] === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`wardrobe-item${active ? ' active' : ''}`}
                      onClick={() => onWear(slot.id, item.id)}
                    >
                      <span className="market-emoji" aria-hidden="true">{item.emoji}</span>
                      <span className="wardrobe-name">{item.name}</span>
                      {active && <span className="wardrobe-on">On ✓</span>}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })
      )}

      {isAdmin && (wardrobe.wishlist || []).length > 0 && (
        <section className="soft-card full-span wardrobe-wishlist">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pooks&apos; wishlist 💖</p>
              <h3>Items she&apos;s been wishing for</h3>
            </div>
          </div>
          <div className="store-grid market-grid">
            {(wardrobe.wishlist || []).map(wearableById).filter(Boolean).map((item) => (
              <article className="market-card" key={item.id}>
                <span className="market-emoji" aria-hidden="true">{item.emoji}</span>
                <h4>{item.name}</h4>
                <small className="market-slot">{slotName(item.slot)} · {item.cost} 🪙</small>
                <button className="text-btn" type="button" onClick={() => onToggleWishlist(item.id)}>Remove</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EmptyWardrobe({ goToMarket }) {
  return (
    <div className="wardrobe-empty">
      <span className="market-emoji" aria-hidden="true">👒</span>
      <h3>The wardrobe is empty</h3>
      <p className="fine-print">Visit Marnich&apos;s Secret Market to find hats, accessories and outfits for Tweety to wear. 💛</p>
      <button className="primary-btn" type="button" onClick={goToMarket}>Go to the Market 🛍️</button>
    </div>
  )
}
