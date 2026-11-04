# TUNEZ9JA 🎵

> A global music streaming and rewards platform for independent artists and their fans — built in Jos, Nigeria, for listeners everywhere.

[![Live](https://img.shields.io/badge/Live-tunez9ja.com-C8102E?style=flat-square)](https://tunez9ja.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Netlify](https://img.shields.io/badge/Hosted-Netlify-00C7B7?style=flat-square&logo=netlify)](https://netlify.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#license)

---

## What is Tunez9ja?

Tunez9ja is a music streaming, video and music-blog platform where everyone who adds value earns from it: listeners earn for listening, artists for being listened to, bloggers for being read, and editors for keeping quality high. Rewards are paid in **TUNEZ**, an in-app credit that unlocks premium songs, albums and posts.

It is built for the whole world. Its roots are in Africa's music — Afrobeats, Highlife, Amapiano, Gospel, Hip-Hop and more — but any independent artist, anywhere, can publish on it, and anyone, anywhere, can listen. It is designed to work well on slow and expensive mobile data, which is how much of the world goes online.

**Live at [tunez9ja.com](https://tunez9ja.com).**

---

## Features

### Listeners
- Stream songs, albums and music videos; browse by genre, charts and search
- **Download songs for offline play** — downloaded music plays with no connection, even after the app is closed
- Installable app (PWA) that opens and works offline; remembers your last song and position
- Full-screen player with queue ("Now playing"), shuffle, repeat, and lock-screen / headphone controls
- Keeps playing after a phone call or other interruption ends
- Keyboard shortcuts on desktop (press `?` in the app for the list)
- Playlists, saved library, follows, comments and reactions
- Earn TUNEZ by listening, reading, watching, reacting, commenting, daily log-in and referrals

### Artists
- Upload songs (MP3, WAV, FLAC, M4A, AAC, OGG) and music videos (upload or YouTube link)
- Credit the **performing artist** when it isn't the uploader (correct credit in the app and in Google)
- Free or premium songs with your own TUNEZ price; albums with track ordering
- Analytics: streams, earnings, followers, genre breakdown
- Identity verification (KYC) required before uploading; optional verified badge

### Bloggers and editors
- Rich-text blog editor with images; posts go through editorial review before publication
- Editors review and approve/reject pending posts from a dedicated dashboard

### Admins
- Moderation for music, posts and videos; user and role management; KYC review; analytics
- "Secure premium audio" tool that keeps premium files in private storage

### Platform
- **AI Party DJ** — 19 event types and 23 genres, with harmonic mixing and crossfades
- **Clean, shareable addresses** for every page and item (`/music`, `/genre/afrobeats`, `/track/<id>/<title-artist>`, `/album/…`, `/artist/…`, `/blog/…`, `/video/…`)
- **Search-engine ready:** server-rendered titles, descriptions, structured data and content for every page, plus a live sitemap
- **Accessible:** audited against WCAG 2.1 AA (and WCAG 2.2 target size) with zero automated violations at the last audit
- Dark and light themes

---

## How TUNEZ works

TUNEZ is an **in-app credit, not a cryptocurrency or investment**. All earning and spending happens in database functions on the server; the browser can't mint or move TUNEZ directly.

### Earning (`earn_tunez`, server-side)

Each eligible action mints a fixed amount, **split three ways**: 50% to the person doing it, 30% to the content's creator, 20% to the platform. Each item only earns again after a cool-down.

| Action | TUNEZ minted | Counts again after |
|---|---|---|
| Stream a song | 10 | 6 hours |
| Read a post | 6 | 24 hours |
| Watch a video | 8 | 6 hours |
| React | 2 | once per item |
| Comment | 4 | once per item |
| Daily log-in (`claim_daily_login`) | 5 | once a day |
| Referral (`claim_referral_bonus`) | 15 each | once, within 7 days of sign-up |

Daily caps and the "halving" eras (earn rates fall as the user base grows) are applied by database functions (`add_tunez`, `get_current_era`); the current era is shown in the app.

### Spending

- **Premium unlocks** (`unlock_premium`): 70% of the price goes to the creator, 30% to the platform.
- **Buying TUNEZ** (Paystack, verified on the server by `verify-tunez-payment`):

| Package | TUNEZ | Price |
|---|---|---|
| Starter | 100 | ₦500 |
| Basic | 300 | ₦1,200 |
| Popular | 700 | ₦2,500 |
| Pro | 1,500 | ₦5,000 |
| Max | 3,500 | ₦10,000 |

- **Artist verification (KYC) fee:** ₦2,000, also verified on the server.

> Prices are currently in Nigerian Naira (NGN) — see [Known limitations](#known-limitations-and-technical-debt).

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5, installable PWA with a hand-written service worker |
| Backend | Supabase — PostgreSQL with Row Level Security, Auth, Storage, Realtime, Edge Functions (Deno) |
| Hosting | Netlify, with Netlify Edge Functions for server-side SEO and the sitemap |
| Payments | Paystack (card, bank transfer, USSD) |
| Runtime dependencies | `@supabase/supabase-js`, `react`, `react-dom`, `lucide-react` (icons), `dompurify` (HTML sanitising) |

---

## Architecture notes

**Routing.** No router library — `src/lib/urlState.js` maps clean paths to pages and items, keeps the address bar in sync (Back/Forward/refresh all work) and rewrites old `/?page=…` / `/?track=…` links. Each item address carries a readable slug; only the id is used to load it.

**Server-side SEO (`netlify/edge-functions/`).**
- `seo.js` runs before every page is served: permanent redirects for old links and outdated slugs; titles, descriptions, canonical URLs, Open Graph/Twitter tags and JSON-LD (`MusicRecording`, `MusicAlbum`, `MusicGroup`, `BlogPosting`, `VideoObject`, `CollectionPage`, breadcrumbs); readable content inside `#root` for crawlers (the app replaces it when it starts); `noindex` for private pages and real 404s for missing ones. Responses are cached at the edge for 5 minutes.
- `sitemap.js` serves `/sitemap.xml` live from the database (pages, genres, artists, albums, songs, posts, videos).

**Player (`src/context/PlayerContext.jsx`).** One global `<audio>` element. Playback position lives in a separate context so lists don't re-render several times a second. Shuffle, repeat, Next/Previous, the queue, lock-screen controls, interruption recovery and session restore all live here.

**Offline (`public/sw.js`, `src/lib/downloads.js`).** The service worker caches the whole app (from `asset-manifest.json`, generated at build), serves audio with byte-range support (so seeking works offline), and keeps user downloads in a separate, never-evicted cache.

**Security model.**
- Row Level Security on user data; private profile fields exposed only through `my_profile` / `admin_profiles` / `public_profile` functions.
- TUNEZ, unlocks, referrals, play counts and notifications go through server functions with permission checks.
- Payments are verified with Paystack on the server (amount, currency, purpose, single use).
- Premium audio lives in the private `music-premium` bucket; listeners get short-lived signed links only after unlocking.
- User HTML (posts, comments) is sanitised with DOMPurify.

**Accessibility.** Text colours use contrast-safe tokens (`--red-text`, `--text-faint`, `--grey-500`); brand red (`--red`) is for backgrounds and borders. Visible keyboard focus everywhere; dialogs and menus use correct ARIA roles; motion respects "reduce motion".

---

## Project structure

```
src/
├── App.jsx                  # App shell: auth, page switching, providers
├── main.jsx
├── components/              # Player bar, full player, track menu, video players,
│                            # wallet, comments, notifications, dashboards' parts…
├── context/
│   ├── AppContext.jsx       # Toasts
│   └── PlayerContext.jsx    # Audio engine, queue, shuffle/repeat, media session
├── hooks/                   # useDashboard, useNavigation, useOnlineStatus
├── lib/
│   ├── urlState.js          # Clean URLs, slugs, artist credit helper
│   ├── useSEO.js            # Client-side titles/meta for in-app navigation
│   ├── audioUrl.js          # Signed links for premium audio
│   ├── downloads.js         # Offline downloads
│   ├── tunez.js             # TUNEZ client calls (all logic is server-side)
│   ├── paystack.js          # Loads Paystack only on payment screens
│   ├── sanitize.js          # DOMPurify wrapper
│   ├── DJBrain.js           # AI Party DJ engine
│   └── …                    # Supabase client, SW registration, image compression…
├── pages/                   # Home, Music, Videos, Blog, Charts, Search, Downloads,
│                            # Auth, About, Terms, Privacy and the five dashboards
└── styles/global.css
public/
├── sw.js                    # Service worker
├── manifest.json            # PWA manifest (icons, shortcuts)
└── robots.txt
netlify/edge-functions/      # seo.js, sitemap.js
supabase/
├── functions/               # verify-tunez-payment, secure-premium-audio
└── migrations/              # Security and feature migrations (see below)
```

---

## Getting started

### Prerequisites
- Node.js 18+
- Access to the Tunez9ja Supabase project (or a copy of its schema — see the note below)
- A Paystack account (test keys are fine for development)
- Optional: [Netlify CLI](https://docs.netlify.com/cli/get-started/) to run the edge functions locally

### Environment variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_PAYSTACK_PUBLIC_KEY=<pk_test_… or pk_live_…>
```

The edge functions read the same `VITE_SUPABASE_*` variables from Netlify's environment.

### Run

```bash
npm install
npm run dev        # http://localhost:5173 — the app only (no edge functions)
netlify dev        # optional: app + edge functions (SEO, sitemap)
npm run build      # production build in dist/ (also writes asset-manifest.json)
npm run preview
```

### Backend (Supabase)

> **Important:** the repository does not yet contain the full database schema. Most tables were created in the Supabase dashboard; `supabase/migrations/` holds the security and feature changes made on top. A fresh Supabase project cannot be fully rebuilt from this repo alone — see [Known limitations](#known-limitations-and-technical-debt).

**Migrations** (run in order in the SQL editor; each is safe to re-run):
1. `20261004_security_hardening.sql` — server-side TUNEZ economy, permission checks, private profile fields, storage policies
2. `20261021_audit_fixes.sql` — notifications and wallets locked down, private premium audio, admin views, play counts, sign-up trigger
3. `20261103_performer_name.sql` — credited performing artist on tracks

**Edge functions** (always pass the project ref):
```bash
npx supabase functions deploy verify-tunez-payment --project-ref <project-ref>
npx supabase functions deploy secure-premium-audio --project-ref <project-ref>
```
Secrets: `PAYSTACK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

**Storage buckets:** `music-audio` (public, free songs), `music-premium` (**private**, premium songs), `music-covers`, `post-images`, `avatars`, `editor-cvs` (private), plus the KYC and video buckets configured in the dashboard.

**Auth settings:** turn on *Confirm email*; set the Site URL to `https://tunez9ja.com` and add `https://tunez9ja.com/**` to the redirect URLs.

---

## Deployment

- `main` deploys to Netlify automatically; the custom domain is **tunez9ja.com**.
- Netlify Edge Functions in `netlify/edge-functions/` deploy with the site.
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_PAYSTACK_PUBLIC_KEY` in Netlify's environment variables.
- **Netlify credits:** the site is on a credit-based plan where every production deploy costs credits. Batch changes into fewer deploys; to push several commits without deploying each one, stop builds in Netlify, push, then re-enable builds and trigger one deploy.
- After deploying database changes, run SQL migrations **before** the app deploy that depends on them.

---

## Testing and quality

The repository has **no automated test suite or linter yet**. Changes have been verified with checks run outside the repository:
- Browser tests (Playwright) for playback, queue, shuffle/repeat, offline downloads, installed-app offline start, premium access and navigation
- Edge-function tests under Deno (redirects, structured data, 404s, sitemap)
- SQL policy tests on a local PostgreSQL copy of the security rules
- Accessibility audits with axe-core (WCAG 2.1 AA + WCAG 2.2 target size) across 36 page/state combinations

Bringing these into the repo (with `npm test` and CI) is the top technical-debt item below.

---

## Known limitations and technical debt

| Area | Issue |
|---|---|
| Payments | Paystack charges in **Naira (NGN)** only. International cards work only if enabled on the Paystack account, and prices aren't shown in local currencies. A multi-currency or international processor is needed for a truly global launch. |
| Database | The full schema isn't versioned; only later migrations are. The base schema should be exported (`supabase db dump`) into `supabase/migrations/`. |
| Tests | No automated tests or CI in the repo (see above). |
| Code size | Several very large components (e.g. `AdminDashboard.jsx` ≈1,370 lines, `BloggerDashboard.jsx` ≈1,120) and ~2,400 inline style blocks; splitting components and moving styles into CSS would ease maintenance. |
| Media costs | Audio is served from Supabase Storage; bandwidth costs grow with plays. Moving media to Cloudflare R2 (no egress fees) is planned. |
| Copyright | Uploads are reviewed by editors but there's no automatic fingerprinting; a takedown/DMCA process should be documented. |
| Legal | The company is registered in Nigeria and the Terms and Privacy Policy reference Nigerian law (including the Nigeria Data Protection Act). Review them with a lawyer for users in other regions (e.g. GDPR in the EU/UK, CCPA in California). |
| Mobile apps | The Android app is a Trusted Web Activity (PWABuilder). Store builds must hide in-app purchases of digital goods or use the stores' billing. iOS needs a native wrapper. |

---

## Roadmap

**Done**
- Music, video, blog, albums, charts and genre pages; five role-based dashboards
- Server-side TUNEZ economy, Paystack purchases and KYC fee with server verification
- Offline downloads, installable offline app, full-screen player, interruption recovery
- Clean URLs, server-side SEO, live sitemap, custom domain
- Password reset, security audit fixes, WCAG 2.1 AA accessibility pass

**Next**
- Multi-currency / international payments
- Media on Cloudflare R2; faster, resized cover images
- CAPTCHA on sign-up and log-in
- Android app on Google Play; iOS app
- Pi Network edition (Pi log-in and Pi payments)
- Automated tests and CI; full schema in migrations
- Creator plans (Pro artist), push notifications, email notifications

**Later**
- On-chain TUNEZ, peer-to-peer transfers, community governance
- Label portal, live streaming, merchandise

---

## Built by

**Web3.0 Alliance Ltd** (RC: 7919874) — Jos, Plateau State, Nigeria
Founder & lead developer: **Dinfa Kefas Dashe** (@Darshes)

---

## License

Proprietary. All rights reserved. © Tunez9ja Entertainment / Web3.0 Alliance Ltd.
