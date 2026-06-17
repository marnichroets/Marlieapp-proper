// Inbox / Messages — pure data + helpers (no components, Fast-Refresh friendly).
//
// Three kinds of message land in Pooks' inbox:
//   • council  — a warm daily "good morning" from The Bird Council 🪶 with a
//                real South African bird fact, written in the Council's funny,
//                slightly self-important voice.
//   • marnich  — a personal note Marnich sends from the Admin panel 💛.
//   • system   — official Council announcements for milestones, Tweety growth
//                and egg hatchings.
//
// Messages feel like letters arriving, not notifications.

export const COUNCIL_SENDER = { name: 'The Bird Council 🪶', icon: '🪶', type: 'council' }
export const MARNICH_SENDER = { name: 'Agent Marnich 💛', icon: '💛', type: 'marnich' }
export const SYSTEM_SENDER = { name: 'The Bird Council 🪶', icon: '📜', type: 'system' }

// 60+ unique daily greetings so two full months pass before any repeat.
export const COUNCIL_MESSAGES = [
  'Good morning Pooks! Did you know the African Hoopoe is the only bird that feeds its chicks by regurgitating insects directly into their mouths? The Council finds this disgusting but impressive. 🪶',
  'Rise and shine Field Agent! The Hamerkop builds the largest nest of any bird in Africa — up to 1.5 metres wide and strong enough for a human to stand on. Imagine the mortgage. 🪶',
  'Morning Pooks! The Secretary Bird kills snakes by stomping on them with its powerful feet. The Council respects this energy. 🪶',
  'Good morning! The Cape Weaver male builds up to 25 nests per season trying to impress females. The female inspects each one and rejects most of them. Agent Marnich finds this deeply relatable. 🪶',
  'Rise and shine! The Hadeda Ibis screams not because it is in danger, but because it is startled by its own ability to fly. The Council has confirmed this is emotionally valid. 🪶',
  'Good morning Pooks! The Southern Ground Hornbill can live for up to 70 years. That is a very long time to look that grumpy. The Council salutes the commitment. 🪶',
  'Morning Field Agent! The Lilac-breasted Roller flips and tumbles through the air during courtship. Showing off works, apparently. Take notes. 🪶',
  'Good morning! The African Fish Eagle has a call so iconic it is called "the voice of Africa". The Council has heard worse ringtones. 🪶',
  'Rise and shine Pooks! The Greater Honeyguide leads humans to bee hives and waits for a share of the honey. A bird with a business model. The Council is impressed. 🪶',
  'Good morning! A Malachite Kingfisher weighs less than a R5 coin but dives like it owns the river. Small but absolutely fearless — like someone we know. 🪶',
  'Morning Pooks! The Ostrich has an eye bigger than its brain. The Council has chosen not to comment further out of professional courtesy. 🪶',
  'Good morning Field Agent! The Cape Sugarbird has a tail longer than its entire body. Impractical? Yes. Fabulous? Also yes. 🪶',
  'Rise and shine! The Pin-tailed Whydah grows ridiculous breeding tail feathers, then drops them all when the season ends. Seasonal wardrobes — the Council approves. 🪶',
  'Good morning Pooks! Egyptian Geese are fiercely loyal and mate for life. They also hiss at anyone who comes near. Romantic AND territorial. Iconic. 🪶',
  'Morning! The Bokmakierie sings in perfect duets with its partner, finishing each other’s phrases. The Council finds this nauseatingly adorable. 🪶',
  'Good morning Pooks! The Kori Bustard is the heaviest flying bird in Africa. It would rather walk than fly, which the Council deeply understands on a Monday. 🪶',
  'Rise and shine! The Fork-tailed Drongo imitates other birds’ alarm calls to scare them off their food, then steals it. A tiny con artist. The Council is reluctantly impressed. 🪶',
  'Good morning Field Agent! Spotted Eagle-Owls can rotate their heads about 270 degrees. They cannot move their eyes, so they had to improvise. Resourceful. 🪶',
  'Morning Pooks! The Cape Robin-Chat often sings before sunrise from a hidden perch. A shy performer with main-character energy. The Council relates. 🪶',
  'Good morning! Blacksmith Lapwings are named for their call, which sounds like a hammer on an anvil. Nature’s most aggressive doorbell. 🪶',
  'Rise and shine Pooks! Lesser Flamingos get their pink colour from the algae they eat. You are, quite literally, what you eat. The Council suggests more snacks. 🪶',
  'Good morning! The Crested Barbet has a call like a tiny alarm clock and absolutely no intention of ever stopping. The Council has filed three noise complaints. 🪶',
  'Morning Field Agent! Weaver birds tie actual knots in grass with their beaks to build their nests. Engineering degrees not required, apparently. 🪶',
  'Good morning Pooks! The African Jacana males do all the parenting, carrying chicks under their wings. The Council nominates them for Father of the Year. 🪶',
  'Rise and shine! The Pied Kingfisher can hover perfectly still over water before diving. It is the only kingfisher in the world that can do this. Show-off. 🪶',
  'Good morning! The Grey Go-away-bird is named after its call, which sounds like it is rudely telling you to "g-waaay". Honestly, same. 🪶',
  'Morning Pooks! Superb Starlings are so iridescent they look photoshopped. The Council assures you they are simply showing off in HD. 🪶',
  'Good morning Field Agent! The Cape Gannet dives into the ocean at 100 km/h, hitting the water like a feathered missile. No fear. Only fish. 🪶',
  'Rise and shine Pooks! A Sociable Weaver colony builds one giant communal nest that can house 100+ birds for generations. The original apartment block. 🪶',
  'Good morning! The Knysna Turaco has wings that flash bright crimson, coloured by a true red pigment found almost nowhere else in birds. Rare and dramatic. 🪶',
  'Morning! The Black-collared Barbet duets so precisely it sounds like one bird. Two birds, one ringtone. The Council is unsettled but impressed. 🪶',
  'Good morning Pooks! The African Paradise Flycatcher trails a tail twice its body length and still manages to look effortless. Rude, frankly. 🪶',
  'Rise and shine Field Agent! The Cattle Egret follows large animals around to snap up insects they stir up. A bird that lets others do the hard work. Smart. 🪶',
  'Good morning! The Verreaux’s Eagle-Owl has bright pink eyelids. Nobody asked why, and the owl refuses to explain. The Council respects the mystery. 🪶',
  'Morning Pooks! The Red-billed Quelea is the most numerous wild bird on Earth — flocks can number in the millions. Imagine the group chat. 🪶',
  'Good morning! The Bateleur eagle gets its name from the French for "tightrope walker" because it rocks its wings as it glides. A daredevil of the skies. 🪶',
  'Rise and shine Pooks! The Cape White-eye travels in cheerful little flocks and helps pollinate flowers as it sips nectar. A tiny helpful gremlin. 🪶',
  'Good morning Field Agent! The Speckled Mousebird hangs upside down to sunbathe in the mornings, warming its belly. The Council calls this self-care. 🪶',
  'Morning! The Burchell’s Coucal is nicknamed the "rainbird" because it calls a bubbling song before storms. A feathered weather app. 🪶',
  'Good morning Pooks! The Southern Red Bishop male turns brilliant scarlet to attract a mate, then fades back to drab brown afterwards. Seasonal glow-up. 🪶',
  'Rise and shine! The African Darter swims with only its snake-like neck above water, earning it the name "snakebird". Stealth mode: activated. 🪶',
  'Good morning Field Agent! The Cape Batis is a tiny flycatcher with a fierce attitude and a permanent disapproving expression. The Council finds it iconic. 🪶',
  'Morning Pooks! The Helmeted Guineafowl is so loud and dramatic when alarmed that farmers use them as living burglar alarms. Useful chaos. 🪶',
  'Good morning! The Yellow-billed Hornbill seals the female inside the nest with mud while she incubates, leaving only a slot to pass food. Extreme, but committed. 🪶',
  'Rise and shine Pooks! The Klaas’s Cuckoo lays its eggs in other birds’ nests and lets them do all the parenting. The Council does not endorse this lifestyle, but understands the appeal. 🪶',
  'Good morning! The Cape Longclaw flashes a bright orange throat and is sometimes called the "African meadowlark". A pop of colour in the grass. 🪶',
  'Morning Field Agent! The Wattled Crane is one of the rarest cranes in the world, and South Africa is one of its last strongholds. Treasure it. 🪶',
  'Good morning Pooks! The Diederik Cuckoo is named after its own call — "dee-dee-deederik". A bird that introduces itself. Polite. 🪶',
  'Rise and shine! The Cape Glossy Starling has bright orange eyes and a metallic green sheen. It looks expensive. It is, in fact, everywhere. 🪶',
  'Good morning! The Spur-winged Goose has sharp spurs on its wings AND mildly toxic flesh from the beetles it eats. Beautiful and not to be messed with. 🪶',
  'Morning Pooks! The Pearl-spotted Owlet has two fake "eyes" on the back of its head to fool predators. Eyes in the back of its head — every parent’s dream. 🪶',
  'Good morning Field Agent! The Olive Thrush is one of the most common garden birds, yet it sings one of the prettiest dawn songs. Quiet excellence. 🪶',
  'Rise and shine Pooks! The Jackal Buzzard is named for its call, which sounds eerily like a barking jackal. A bird doing impressions. The Council is amused. 🪶',
  'Good morning! The Malachite Sunbird’s feathers are not actually green-pigmented — the colour comes from light bouncing off their structure. Science is showing off. 🪶',
  'Morning Pooks! Red-winged Starlings mate for life and will dive-bomb anyone who threatens their nest, including humans. Devotion with consequences. 🪶',
  'Good morning Field Agent! The African Spoonbill sweeps its flat bill side to side through water to catch food. A bird that eats with a built-in spatula. 🪶',
  'Rise and shine! The Crowned Lapwing lays its eggs straight on bare ground and defends them with theatrical screaming. No nest, all attitude. 🪶',
  'Good morning Pooks! The Brown-hooded Kingfisher often hunts far from water, catching insects and lizards in gardens. A kingfisher that broke the rules. 🪶',
  'Morning! The Cape Bulbul has a striking white eye-ring and a bubbly, chattering song. The Council describes its vibe as "relentlessly cheerful". 🪶',
  'Good morning Field Agent! The Long-tailed Widowbird trails a tail up to half a metre long in flight — so long it struggles in the wind. Fashion over function. 🪶',
  'Rise and shine Pooks! The Three-banded Plover bobs up and down constantly as it walks, as if listening to a song only it can hear. The Council respects the rhythm. 🪶',
  'Good morning! The Amethyst Sunbird looks plain black until the light hits it, then its throat flashes deep purple. A bird with a dramatic reveal. 🪶',
  'Morning Pooks! The Karoo Thrush and Olive Thrush are so similar that even the Council occasionally needs a moment. Identification is humbling. 🪶',
  'Good morning Field Agent! The Fiscal Flycatcher is often mistaken for the Common Fiscal, but it lacks the "butcher bird" habit of impaling prey on thorns. A gentler twin. 🪶',
  'Rise and shine Pooks! The Reed Cormorant spreads its wings to dry in the sun because its feathers are not fully waterproof. A swimmer who forgot a towel. 🪶',
  'Good morning! The White-browed Robin-Chat (Heuglin’s Robin) sings a rising, ringing duet at dawn that carries across the whole garden. Nature’s alarm, but pretty. 🪶',
]

// One-off good-luck dispatches for the week of Pooks' big presentation (Fri
// 19 Jun 2026). Keyed by the same YYYY-MM-DD key tweetyTodayKey() produces, so
// on these exact days they REPLACE the normal rotating council message. Any
// other day this map has no match and the usual rotation runs unchanged — once
// the week passes nothing here ever fires again, no cleanup needed.
export const SPECIAL_COUNCIL_MESSAGES = {
  '2026-06-15':
    'Good morning Pooks! The Council heard about your big presentation on Friday. Even the Secretary Bird is nervous for you, and he is never nervous. You’ve got this. 🪶',
  '2026-06-16':
    'The Council has reviewed your preparation from afar (we cannot say how) and is confident. Field Agents are rooting for you today. 💛',
  '2026-06-17':
    'Two more days until your presentation, Pooks. The Hadeda has agreed to be slightly less loud tomorrow morning, as a show of support.',
  '2026-06-18':
    'Tomorrow is the big day. The whole Council — even the dramatic ones — believes in you. Sleep well, Field Agent.',
  '2026-06-19':
    'Today is the day, Pooks. Go show them what the Bird Council already knows: you are remarkable. Good luck. We are all rooting for you — Agent Marnich included, who is somehow more nervous than you are. 💛🪶',

  // --- Cape Town Special Week (Sat 20 Jun → Mon 29 Jun 2026) ---------------
  // Daily dispatches while Pooks is "deployed to the Cape Town Division".
  // After 29 Jun this map has no match and the normal rotation resumes — no
  // cleanup needed, same as the presentation week above.
  '2026-06-20':
    'Field Agent Pooks has been deployed to the Cape Town Division! The Western Cape field agents have been notified. Local specialty: keep your eyes open for the Cape Sugarbird — found nowhere else on Earth. 🪶',
  '2026-06-21':
    'Cape Town Division briefing: the African Penguin colony at Boulders Beach is mandatory viewing. They do not care about the Bird Council, but they are very cute and the Council insists you go anyway.',
  // Mon 22 Jun — her job interview. This one REPLACES the funnier Cape Town
  // dispatch with a sincere, warmer good-luck message; it is her dedicated
  // moment for the day.
  '2026-06-22':
    'Good morning, Field Agent. Today is a big day — your interview. The Bird Council has reviewed your file thoroughly: dedicated, sharp-eyed, fearless around vultures, unbothered by eagle-owls staring her down. If that doesn’t qualify someone for anything, nothing does. Go show them what we already know. We are all rooting for you today — Agent Marnich most of all. 💛🪶',
  '2026-06-23':
    'Local intelligence suggests Cape Rockjumpers are notoriously difficult to find. If you do, the Council will personally double your Feather Coins for the week. Good luck, Agent.',
  '2026-06-24':
    'Table Mountain is famous for many things. Birds are one of them. The view is, allegedly, also nice.',
  '2026-06-25':
    'Halfway through your Cape Town deployment. The Potchefstroom Hadeda has been asking when you return. He will not admit he misses you. He absolutely misses you.',
  '2026-06-26':
    'Cape Town field agents report: Southern Double-collared Sunbirds are common in Kirstenbosch Gardens. Should you find yourself there, the Council insists you take a photo. For science.',
  '2026-06-27':
    'One day remaining in the Cape Town Division. Make it count, Agent. The Council will be reviewing your full field report upon return.',
  '2026-06-28':
    'Field Agent Pooks has touched down in Johannesburg — one more sleep before the Potchefstroom Division welcomes her home. The Council recommends rest, and possibly snacks.',
  '2026-06-29':
    'Welcome back to the Potchefstroom Division, Field Agent. The Council trusts the Cape Town deployment was a success. Debrief required immediately — or whenever you’ve unpacked. We are not unreasonable.',
}

// The special good-luck message for a given day key, or null on any normal day.
export function specialCouncilMessage(dayKey) {
  return SPECIAL_COUNCIL_MESSAGES[dayKey] || null
}

// Pick the next council message we have not shown yet, and return the updated
// "shown" log to store. Within a cycle we only ever pick an unshown message, so
// no message repeats until all 60+ have been seen. Once the whole pool is seen
// we start a FRESH cycle (resetting the log) but deliberately skip yesterday's
// message, so she never gets the same dispatch two days running.
export function nextCouncilMessage(shownIndices = []) {
  const shown = new Set(shownIndices)
  const idx = COUNCIL_MESSAGES.findIndex((_, i) => !shown.has(i))
  if (idx !== -1) {
    return { index: idx, text: COUNCIL_MESSAGES[idx], shown: [...shownIndices, idx] }
  }
  // Whole pool seen — begin a new cycle, avoiding an immediate repeat of the
  // most recently shown message.
  const last = shownIndices[shownIndices.length - 1]
  let restart = COUNCIL_MESSAGES.findIndex((_, i) => i !== last)
  if (restart === -1) restart = 0
  return { index: restart, text: COUNCIL_MESSAGES[restart], shown: [restart] }
}

let messageSeq = 0
export function createMessage({ type, sender, icon, title, body, date }) {
  messageSeq += 1
  return {
    id: `msg-${Date.now().toString(36)}-${messageSeq}`,
    type,
    sender,
    icon: icon || '🪶',
    title,
    body,
    date: date || new Date().toISOString(),
    read: false,
    favourite: false,
    reaction: null,
  }
}

export function councilDailyMessage(text) {
  return createMessage({
    type: 'council',
    sender: COUNCIL_SENDER.name,
    icon: COUNCIL_SENDER.icon,
    title: 'Your daily Council dispatch',
    body: text,
  })
}

export function marnichMessage(body, title = 'A note just for you') {
  return createMessage({
    type: 'marnich',
    sender: MARNICH_SENDER.name,
    icon: MARNICH_SENDER.icon,
    title,
    body,
  })
}

export function systemMessage(title, body) {
  return createMessage({
    type: 'system',
    sender: SYSTEM_SENDER.name,
    icon: SYSTEM_SENDER.icon,
    title,
    body,
  })
}

// Pre-written official Council announcements (funny, formal voice).
export function milestoneSystemMessage(rewardName, milestone) {
  return systemMessage(
    'Official Achievement Notice 📜',
    `The Bird Council hereby confirms your achievement: "${rewardName}". ${
      milestone ? `Logging ${milestone} species is no small feat. ` : ''
    }A gift has been authorised in your honour. The paperwork was, as always, excessive. 🪶`,
  )
}

export function tweetyGrowthSystemMessage(name, stageLabel) {
  return systemMessage(
    'Official Growth Certificate 📜',
    `The Bird Council hereby certifies that ${name} has officially grown into a ${stageLabel}. We watched it happen and got a little emotional. Continue the excellent parenting, Field Agent. 🪶`,
  )
}

// One-time keepsake when Tweety reaches the final "crowned adult" stage. Carries
// a personal note from Marnich and lives permanently in her inbox. Edit the note
// text below to say whatever you'd like it to say. 💛
export function crownedAdultKeepsakeMessage(name) {
  const pet = name || 'Tweety'
  return systemMessage(
    'A keepsake for a Crowned Adult 👑',
    `${pet} is all grown up — a crowned adult, thanks to every single day you showed up to care for them.\n\n` +
      `I watched you do this a little at a time, never skipping, never giving up, and honestly it says everything about you. ` +
      `Keep this note — it's proof of how gently and faithfully you love the things in your care.\n\n` +
      `Proud of you, always. 💛\n— Marnich`,
  )
}

export function hatchSystemMessage(species) {
  return systemMessage(
    'Birth Announcement 🥚',
    `Birth announcement from Pooks Bird Sanctuary: a healthy ${species || 'little bird'} has hatched! Mother and chick are doing well. The Council has sent a tiny celebratory cake. 🪶`,
  )
}

export const REACTIONS = ['❤️', '😂', '🐦']

export function relativeMessageTime(iso) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}
