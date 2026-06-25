# TUNEZ9JA — Nigeria's Premier Music Blog & Streaming Platform

## Overview
Tunez9ja is a full-stack Nigerian music streaming and entertainment platform built with React 18 + Vite, Supabase, and Paystack. It features a complete TUNEZ token economy, user-based halving system, and multi-role content management.

**Live:** https://tunez9ja.netlify.app  
**Location:** Jos, Plateau State, Nigeria 🇳🇬  
**Stack:** React 18 + Vite · Supabase (PostgreSQL + Auth + Storage) · Paystack · Netlify

---

## Features

### 🎵 Music
- Stream approved tracks with full audio player (shuffle, repeat, queue)
- Premium tracks unlockable with TUNEZ tokens
- Albums, playlists, save to library
- Add to queue / Play next

### 📰 Blog
- Rich text blog posts with categories
- Premium post unlocks
- Editor role reviews and approves all posts

### 🎬 Videos
- YouTube embed + direct video uploads
- View count tracking

### 🪙 TUNEZ Token Economy
- Earn by streaming (10T), reading (6T), watching (8T), reacting (2T), commenting (4T), daily login (5T), referrals (15T flat)
- **User-based halving** — earn rates reduce at 1K / 5K / 20K / 100K / 500K users
- Spend to unlock premium content (artist 70%, admin/editor 30%)
- Buy TUNEZ via Paystack (₦500 = 100T up to ₦10,000 = 3,500T)
- Verified creators earn 1.5× multiplier on all organic earnings

### 👥 Roles
| Role | Access |
|------|--------|
| **User** | Stream, read, watch, save, playlist, referral |
| **Artist** | All user features + upload tracks/videos/albums |
| **Blogger** | All user features + write/publish blog posts |
| **Editor** | Review & approve/reject blog posts, earn TUNEZ per review |
| **Admin** | Full platform management — approve content, manage users, KYC review, editor management, analytics |

### 🔵 Verified Blue Tick
- Artists: 10,000+ streams, 5+ approved tracks, 90+ days, 500+ earned TUNEZ, no violations
- Bloggers: 25,000+ views, 10+ approved posts, 90+ days, 500+ earned TUNEZ
- KYC + ₦2,000 non-refundable fee required
- Benefits: blue tick everywhere, 1.5× earn rate, priority placement

### ✏️ Editor Role
- Any user/artist/blogger can apply from their dashboard
- Submit CV + motivation → admin reviews → approved editors get Editor Portal access
- Editors earn 5T per free post approved, 15% of price for premium posts
- Admin can view all editor activity, approve/reject/suspend/reinstate editors

---

## Tech Stack
- **Frontend:** React 18, Vite 5, CSS custom properties (dark/light mode)
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Payments:** Paystack (live)
- **Deployment:** Netlify (auto-deploy from GitHub)
- **PWA:** Service worker, installable on iOS/Android

---

## Environment Variables
```
VITE_SUPABASE_URL=https://hjsmdxokyzwpwcjeczmh.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_key
```

---

## Database Tables
`profiles` · `music_tracks` · `blog_posts` · `videos` · `albums` · `comments` · `reactions` · `notifications` · `follows` · `playlists` · `playlist_tracks` · `saved_tracks` · `tunez_balances` · `tunez_transactions` · `tunez_daily_caps` · `tunez_cooldowns` · `tunez_unlocks` · `tunez_halving_eras` · `editor_activity`

---

## Development

```bash
npm install
npm run dev        # localhost:5173
npm run build      # production build
```

---

## Credits
Built by **Web3.0 Alliance Ltd** · Jos, Nigeria  
© 2025 Tunez9ja Entertainment. All rights reserved.
