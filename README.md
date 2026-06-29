# TUNEZ9JA 🎵

> Nigeria's premier music streaming and entertainment platform. Built in Jos. Built for Naija.

[![Live](https://img.shields.io/badge/Live-tunez9ja.netlify.app-C8102E?style=flat-square)](https://tunez9ja.netlify.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Netlify](https://img.shields.io/badge/Deployed-Netlify-00C7B7?style=flat-square&logo=netlify)](https://netlify.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](./LICENSE)

---

## What is Tunez9ja?

Tunez9ja is a full-stack Nigerian music streaming and entertainment platform that rewards every participant — artists, bloggers, editors, and fans — for the value they contribute. Built entirely in Nigeria, for Nigeria, using modern web technology optimised for African network conditions.

Instead of sending Nigerian music revenue abroad, Tunez9ja keeps it local through a native token economy (TUNEZ), transparent content monetisation, and a community-driven editorial system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 (PWA) |
| Backend / Database | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Payments | Paystack (Naira — card, bank transfer, USSD) |
| Deployment | Netlify (auto-deploy from GitHub) |
| Storage | Supabase Storage (audio, covers, videos) |
| AI | Custom DJBrain engine (Nigerian music intelligence) |

---

## Features

### For Listeners (Users)
- Stream approved Afrobeats, Amapiano, Highlife, Gospel and 20+ Nigerian genres
- Earn TUNEZ tokens for every stream, read, watch, reaction and daily login
- Save favourite tracks to personal library (available offline)
- Unlock premium content with TUNEZ or purchase directly via Paystack
- Build and manage playlists
- Follow artists and bloggers
- Refer friends for bonus TUNEZ
- PWA — install on Android or iOS from the browser, no app store needed

### For Artists
- Upload tracks (MP3/WAV/FLAC) and music videos (YouTube or direct upload)
- Set tracks as free or premium with custom TUNEZ pricing
- Earn 70% of every premium unlock
- Full analytics dashboard: streams, earnings, follower count, genre breakdown, 7/30/90-day charts
- Manage albums with track ordering
- Apply for blue tick verification (1.5× earn rate multiplier)
- Editorial review pipeline ensures content quality

### For Bloggers
- Rich text editor with image upload for music news, reviews and interviews
- Submit posts for editorial review before publication
- Earn 6 TUNEZ per free post read, 70% of premium post unlocks
- Audience analytics and earnings breakdown
- Blue tick verification with 1.5× multiplier

### For Editors
- Dedicated editor portal with pending content queue
- Review and approve/reject tracks, blog posts and videos
- Earn 5 TUNEZ per free post approved + 15% of premium post unlock price
- Raise overall platform content quality

### For Admins
- Full content moderation dashboard (music, blog, video)
- User management and role assignment
- KYC review and artist verification
- Platform analytics

### Platform Features
- **AI Party DJ** — Nigerian music intelligence engine with 19 event types (wedding, club, gym, Detty December…), party timeline awareness (arrival → warm-up → peak → recovery → closing), Camelot key harmonic mixing, crowd behaviour learning, automatic crossfade
- **Naija Charts** — Live Top 50, Trending (last 30 days), New Entries (last 14 days), and genre-specific charts with movement indicators
- **Global search** — tracks, artists, blog posts, albums and videos in one place
- **Floating music player** — persists across all pages, with repeat, shuffle, crossfade and media session API (lock screen controls)
- **Floating video player** — picture-in-picture YouTube and direct video playback
- **Offline music** — service worker caches saved tracks and library for offline listening, syncs every 5 minutes in background
- **Follow system** — follow artists, bloggers and users; public follower/following counts on all profiles
- **Notifications** — real-time in-app notifications (new follower, content approved/rejected, TUNEZ earned, premium unlocked)
- **Dark / light mode**
- **Whitepaper widget** — accessible on every page
- **Error boundary** — graceful crash recovery with branded error screen

---

## TUNEZ Token Economy

TUNEZ is the native in-platform utility token. Phase 1 is in-app credits; Phase 2 migrates on-chain.

### Earning
| Activity | TUNEZ Earned |
|---|---|
| Streaming a track | 10T per stream |
| Reading a blog post | 6T per post |
| Watching a video | 8T per video |
| Reacting to content | 2T per reaction |
| Leaving a comment | 4T per comment |
| Daily login | 5T per day |
| Referring a new user | 15T (one-time) |

### Halving System
Earn rates reduce at user milestones, rewarding early adoption:

| Era | Users | Rate | Daily Cap |
|---|---|---|---|
| Genesis | 0–1,000 | 1.0× | 80T |
| Era 1 | 1K–5K | 0.75× | 60T |
| Era 2 | 5K–20K | 0.50× | 40T |
| Era 3 | 20K–100K | 0.25× | 20T |
| Era 4 | 100K–500K | 0.125× | 10T |
| Era 5+ | 500K+ | 0.0625× | 5T |

### Revenue Split on Premium Content
| Recipient | Share |
|---|---|
| Content creator | 70% |
| Platform | 15% |
| Editor who approved | 15% |

### Purchasing TUNEZ
| Package | TUNEZ | Naira |
|---|---|---|
| Starter | 100T | ₦500 |
| Basic | 300T | ₦1,500 |
| Standard | 700T | ₦3,000 |
| Premium | 1,500T | ₦6,000 |
| Elite | 3,500T | ₦10,000 |

---

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── AIDJPlayer.jsx    # AI Party DJ interface
│   ├── ArtistAnalytics.jsx
│   ├── CommentsSection.jsx
│   ├── ErrorBoundary.jsx
│   ├── FloatingPlayer.jsx
│   ├── FloatingVideoPlayer.jsx
│   ├── Navbar.jsx
│   ├── NotificationsPanel.jsx
│   ├── ProfilePage.jsx
│   ├── WhitepaperWidget.jsx
│   └── ...
├── context/
│   ├── AppContext.jsx    # Toast notifications
│   └── PlayerContext.jsx # Global audio player state
├── hooks/
│   └── useNavigation.js  # Browser-style back/forward history
├── lib/
│   ├── DJBrain.js        # AI DJ scoring engine
│   ├── supabase.js       # Supabase client
│   └── tunez.js          # TUNEZ token logic
├── pages/
│   ├── Home.jsx
│   ├── Music.jsx
│   ├── Videos.jsx
│   ├── Blog.jsx
│   ├── ChartsPage.jsx
│   ├── ArtistDashboard.jsx
│   ├── BloggerDashboard.jsx
│   ├── AdminDashboard.jsx
│   ├── UserDashboard.jsx
│   └── ...
└── App.jsx               # Root — routing, auth, providers
public/
└── sw.js                 # Service worker (offline caching)
```

---

## Getting Started (Development)

### Prerequisites
- Node.js 18+
- A Supabase project
- A Paystack account

### Environment Variables
Create `.env` in the project root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

### Install and Run
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

---

## Database

Tunez9ja uses Supabase (PostgreSQL) with Row Level Security on all tables.

Key tables: `profiles`, `music_tracks`, `albums`, `blog_posts`, `videos`, `saved_tracks`, `playlist_tracks`, `playlists`, `tunez_balances`, `tunez_transactions`, `tunez_unlocks`, `follows`, `notifications`, `comments`, `reactions`, `kyc_applications`

---

## Deployment

The app auto-deploys to Netlify on every push to the `main` branch via GitHub integration.

```bash
git add .
git commit -m "your message"
git push origin main
```

Netlify handles: HTTPS, CDN, preview deployments, redirect rules for SPA routing.

---

## Roadmap

### Phase 1 — Foundation ✅ (Current)
- Full platform: music, blog, video, albums, charts
- TUNEZ token economy with halving system
- Artist, blogger, editor and admin dashboards
- Paystack integration (Naira-native)
- PWA with offline music playback
- AI Party DJ
- Follow system and public profiles
- Real-time notifications

### Phase 2 — Growth (6–18 Months)
- TUNEZ on-chain migration (blockchain utility token)
- Peer-to-peer TUNEZ transfers
- Google OAuth login
- Artist merchandise integration
- Live streaming capability
- Label portal for multi-artist management
- West African expansion (Ghana, Côte d'Ivoire)
- Push notifications (web)
- Email notifications via Resend
- Password reset flow

### Phase 3 — Maturity (18–36 Months)
- Decentralised governance (TUNEZ holders vote on platform parameters)
- East and Southern African expansion
- Fiat-to-TUNEZ DEX integration
- Mobile apps (React Native)

---

## Built By

**Web3.0 Alliance Ltd** — RC: 7919874  
Jos, Plateau State, Nigeria  

Founder & Lead Developer: **Dinfa Kefas Dashe** (@Darshes)  
Director of ICT: Realsmart Tech Nigeria Ltd  

---

## License

Proprietary. All rights reserved. © 2025 Tunez9ja Entertainment / Web3.0 Alliance Ltd.
