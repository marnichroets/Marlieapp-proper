// Bird Store UI — owned items show a green badge, locked items show the cost.
import { STORE_SECTIONS, isOwned } from './store'

export function BirdStore({ store, coins, onBuy, giftMode = false }) {
  return (
    <div className="bird-store">
      {STORE_SECTIONS.map((section) => (
        <section className="soft-card full-span" key={section.key}>
          <p className="eyebrow">{section.title}</p>
          <div className="store-grid">
            {section.items.map((item) => {
              const owned = isOwned(store, section, item.id)
              const isDefault = item.cost === 0
              const canBuy = !owned && coins >= item.cost
              const showOwned = (owned || isDefault) && !giftMode
              return (
                <article className={`store-item${showOwned ? ' owned' : ''}`} key={item.id}>
                  <span className="store-emoji" aria-hidden="true">{item.emoji}</span>
                  <h4>{item.name}</h4>
                  <p>{item.desc}</p>
                  {giftMode ? (
                    isDefault ? (
                      <span className="store-owned">Default</span>
                    ) : (
                      <button
                        className="secondary-btn store-buy"
                        type="button"
                        onClick={() => onBuy(section, item)}
                      >
                        Gift 🎁
                      </button>
                    )
                  ) : showOwned ? (
                    <span className="store-owned">Owned ✅</span>
                  ) : (
                    <button
                      className="primary-btn store-buy"
                      type="button"
                      disabled={!canBuy}
                      onClick={() => onBuy(section, item)}
                    >
                      {item.cost} 🪙
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
