# 🎵 Tunez9ja Entertainment

> **Nigeria's Premier Music Blog Platform** — Stream. Discover. Earn. Connect.

Tunez9ja is a full-stack music blog and streaming platform built for the Nigerian entertainment ecosystem. Users stream music, read blogs, watch videos, and earn **TUNEZ tokens** for engaging with content. Artists, bloggers, and creators upload and monetize their work — all within a single platform.

---

## 🌐 Live Demo

> Coming soon — deploying to Netlify with custom domain **tunez9ja.com**

---

## 🛠 Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | React 18 + Vite 5                               |
| Backend      | Supabase (PostgreSQL, Auth, Storage, Realtime)  |
| Styling      | Custom CSS Design System (dark/light mode)      |
| Payments     | Paystack (live integration, popup callback)     |
| PWA          | Service Worker + Web App Manifest               |
| Icons        | Lucide React                                    |
| Rich Text    | Custom RichTextEditor component                 |
| Deployment   | Netlify (CI/CD from GitHub main branch)         |

---

## ✨ Features

### 🎧 Music
- Stream approved tracks with a persistent **floating audio player**
- **Shuffle**, **Repeat** (all / one), **Play Next** queue management
- Genre filtering, search, and track sorting
- Save tracks to personal library
- Create and manage **playlists**
- **Albums** — artists bundle tracks into albums (free or premium)
- Play count displayed publicly on every track
- PWA offline support — cache tracks for offline playback

### 📰 Blog
- Rich-text blog posts with cover images
- Category filtering and search
- Post **view count** displayed publicly
- Comment and reply system with TUNEZ rewards
- XSS-safe HTML rendering (sanitised before display)

### 🎬 Videos
- YouTube embed + direct video upload support
- Floating video player (draggable, minimisable)
- **View count** incremented and displayed on every card
- Music player pauses automatically when video plays

### 👤 User Roles
| Role     | Capabilities                                                  |
|----------|---------------------------------------------------------------|
| User     | Stream, read, watch, comment, react, create playlists, earn  |
| Artist   | Everything above + upload tracks, manage albums, upload videos|
| Blogger  | Everything above + write blog posts, upload videos           |
| Admin    | Full moderation — approve/reject/edit all content + analytics|

> Users can hold multiple roles simultaneously (e.g. Artist + Blogger + User)

### 🪙 TUNEZ Token Economy
TUNEZ is an **in-app virtual credit** (not a cryptocurrency or financial security).

| Action              | Reward  | Limit                  |
|---------------------|---------|------------------------|
| Stream track (10s+) | 10 T    | 6h cooldown per track  |
| Read post (15s+)    | 6 T     | 24h cooldown per post  |
| Watch video (10s+)  | 8 T     | 6h cooldown per video  |
| React to content    | 2 T     | Once per content       |
| Leave a comment     | 4 T     | Once per content       |
| Daily login bonus   | 5 T     | Once per calendar day  |
| Refer a friend      | 15 T    | Per successful signup  |
| Daily cap           | 80 T    | Resets at midnight     |

**Premium Content** — Creators set a TUNEZ price; users pay to unlock forever. Creator earns 70%, admin earns 30%.

**Buy TUNEZ** via Paystack:
| Package | Price  | TUNEZ  |
|---------|--------|--------|
| Starter | ₦500   | 100 T  |
| Basic   | ₦1,200 | 300 T  |
| Popular | ₦2,500 | 700 T  |
| Pro     | ₦5,000 | 1,500 T|
| Max     | ₦10,000| 3,500 T|

### 🔔 Notifications
- Real-time in-app notifications via **Supabase Realtime**
- Bell icon with unread badge in navbar
- Triggered by: new comment, new follower, content approval/rejection, TUNEZ earned, referral bonus

### 👥 Follow System
- Follow any artist or blogger
- In-app notification when someone you follow publishes new content
- Follower count displayed on artist public profiles

### 🔍 Search
- Global search across tracks, albums, artists, blog posts, and videos
- Live debounced results (350ms)
- Tabbed results by content type with counts

### 👤 Profiles
- Every user has a public profile with avatar, bio, location, website
- Profile photo upload (tap avatar to change — 2MB max, JPEG/PNG/WebP)
- Avatar displayed globally in navbar, comments, artist cards, and search results

### 🛡 Security
- XSS protection — blog HTML sanitised before render
- Input sanitisation on all form fields and email inputs
- Page route whitelist — prevents route injection
- Comment body stripped of HTML tags (1000 char limit)
- `.env` blocked from git via `.gitignore`
- Supabase RLS disabled on TUNEZ tables (uses `SECURITY DEFINER` RPCs instead)
- Storage policies — users can only upload to their own folder (`userid/avatar.jpg`)
- Duplicate content detection — rejects uploads with identical titles from same author

### 📊 Admin Dashboard
- **Content Review** — approve/reject music, posts, videos, albums
- **Edit** any published content (title, genre, description)
- **TUNEZ Wallet** — view platform token ledger
- **Analytics** — total users, artists, bloggers, tracks, posts, videos, albums, TUNEZ minted, revenue, top earners, recent signups

---

## 📁 Project Structure

```
tunez9ja/
├── public/
│   ├── logo.png               # App icon (transparent PNG)
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker (offline cache)
├── src/
│   ├── pages/
│   │   ├── Home.jsx           # Landing page
│   │   ├── Music.jsx          # Track listing + Albums tabs
│   │   ├── Blog.jsx           # Blog posts
│   │   ├── Videos.jsx         # Video library
│   │   ├── SearchPage.jsx     # Global search
│   │   ├── Auth.jsx           # Login / Signup (3 roles)
│   │   ├── AdminDashboard.jsx # Admin moderation + analytics
│   │   ├── ArtistDashboard.jsx# Artist uploads + wallet
│   │   ├── BloggerDashboard.jsx# Blogger writing + wallet
│   │   ├── UserDashboard.jsx  # User overview + library + wallet
│   │   ├── Terms.jsx
│   │   └── Privacy.jsx
│   ├── components/
│   │   ├── Navbar.jsx         # Sticky nav + search + notifications + TUNEZ balance
│   │   ├── FloatingPlayer.jsx # Persistent audio player (shuffle/repeat/next)
│   │   ├── FloatingVideoPlayer.jsx
│   │   ├── CommentsSection.jsx# Threaded comments + reactions
│   │   ├── NotificationsPanel.jsx # Bell icon + realtime notifications
│   │   ├── ProfileEditor.jsx  # Avatar upload + profile edit (all roles)
│   │   ├── ArtistProfile.jsx  # Public artist/blogger profile page
│   │   ├── FollowButton.jsx   # Follow/unfollow + follow counts
│   │   ├── ShareButton.jsx    # Share to WhatsApp/Twitter/Telegram/Facebook
│   │   ├── TunezWallet.jsx    # Token balance, history, Paystack top-up
│   │   ├── AdminAnalytics.jsx # Platform stats dashboard
│   │   ├── Albums.jsx         # Album browser
│   │   ├── AlbumManager.jsx   # Artist album creation
│   │   ├── Playlists.jsx      # User playlist management
│   │   ├── MyLibrary.jsx      # Saved tracks + offline cache
│   │   ├── PremiumUnlockModal.jsx
│   │   ├── SearchPage.jsx
│   │   └── UI.jsx             # Shared components (Logo, Modal, EmptyState, etc.)
│   ├── context/
│   │   └── PlayerContext.jsx  # Global audio state (queue, shuffle, repeat)
│   ├── hooks/
│   │   └── useDashboard.js    # Shared dashboard data hook
│   ├── lib/
│   │   ├── supabase.js        # Supabase client
│   │   └── tunez.js           # TUNEZ token engine (earn/spend/unlock)
│   ├── styles/
│   │   └── global.css         # Design system (dark + light mode)
│   └── App.jsx                # Root component + routing + TelegramPopup
├── supabase/
│   └── functions/
│       └── verify-tunez-payment/  # Edge function for Paystack verification
├── .env.local                 # Environment variables (NOT committed)
├── .gitignore
├── index.html
├── vite.config.js
└── package.json
```

---

## 🗄 Database Schema (Supabase)

### Core Tables
| Table           | Description                          |
|-----------------|--------------------------------------|
| `profiles`      | User profiles (all roles, avatar, bio)|
| `music_tracks`  | Uploaded tracks (status, premium, play_count) |
| `blog_posts`    | Blog posts (status, premium, view_count) |
| `videos`        | Videos (YouTube or upload, view_count)|
| `albums`        | Artist albums (tracks bundled)       |
| `comments`      | Threaded comments on any content     |
| `reactions`     | Likes/reactions on content           |
| `notifications` | In-app notifications (realtime)      |
| `follows`       | Follow relationships between users   |
| `playlists`     | User-created playlists               |
| `playlist_tracks`| Tracks inside playlists             |
| `saved_tracks`  | User saved/liked tracks              |

### TUNEZ Tables (RLS disabled, SECURITY DEFINER RPCs)
| Table                | Description                     |
|----------------------|---------------------------------|
| `tunez_balances`     | Per-user balance + lifetime stats|
| `tunez_transactions` | Full ledger of all token events |
| `tunez_daily_caps`   | Daily earning limits per user   |
| `tunez_cooldowns`    | Per-content cooldowns           |
| `tunez_unlocks`      | Premium content unlock records  |
| `tunez_purchases`    | Paystack purchase records       |

### Key SQL Functions
- `add_tunez(user_id, amount, type, description)` — credit tokens
- `spend_tunez(user_id, amount, type, description)` — deduct tokens
- `increment_daily_tunez(user_id, date, amount)` — update daily cap
- `credit_purchased_tunez(user_id, paystack_ref, ngn, tunez)` — Paystack webhook
- `increment_play_count(track_id)` — track stream counter
- `increment_view_count(post_id)` — blog post view counter
- `increment_video_views(video_id)` — video view counter
- `notify_followers(author_id, message)` — fan notification on new post
- `check_duplicate_title(table, title, author_id)` — duplicate content guard

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Paystack](https://paystack.com) account (live keys)

### 1. Clone the repo
```bash
git clone https://github.com/Dinfadashe/tunez9ja.git
cd tunez9ja
npm install
```

### 2. Environment variables
Create `.env.local` in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your-key
```

### 3. Set up the database
Run the SQL files in Supabase SQL Editor in this order:
1. `setup.sql` — all tables, columns, storage bucket, count functions
2. `follows.sql` — follows table and notify_followers function

### 4. Deploy the Edge Function
```bash
supabase functions deploy verify-tunez-payment
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your-key
```

### 5. Run locally
```bash
npm run dev
```

### 6. Build for production
```bash
npm run build
```

---

## 🌍 Deployment (Netlify)

1. Push to GitHub (`main` branch)
2. Connect repo to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in Netlify dashboard

---

## 📱 PWA Support

Tunez9ja is a **Progressive Web App**:
- Install prompt on Android and Desktop
- Offline music playback (cached via Service Worker)
- Mobile-optimised UI
- App manifest with icons and theme colour

---

## 🔐 Environment Variables

| Variable                    | Description                    |
|-----------------------------|--------------------------------|
| `VITE_SUPABASE_URL`         | Your Supabase project URL      |
| `VITE_SUPABASE_ANON_KEY`    | Supabase anon/public key       |
| `VITE_PAYSTACK_PUBLIC_KEY`  | Paystack live public key       |

> Never commit `.env.local` — it is blocked by `.gitignore`

---

## 👨‍💻 Author

**Dinfa Dashe Kefas**  
Founder & Director — Web3.0 Alliance Ltd  
Full-Stack Developer · Blockchain Educator · Tech Entrepreneur  
📍 Jos, Plateau State, Nigeria  
📧 dinfadashe@gmail.com  
🌐 [@Web3Tribe](https://t.me/dinfa) · [Telegram Community](https://t.me/+BpaRRvm53U1kZGM0)

---

## 📄 License

© 2025 Tunez9ja Entertainment / Web3.0 Alliance Ltd. All rights reserved.

This codebase is proprietary. Unauthorised copying, modification, or distribution is prohibited without express written permission from the author.

---

## 🤝 Contributing

This is a private commercial project. For partnership enquiries or bug reports, contact **dinfadashe@gmail.com**.

---

*Built with ❤️ in Nigeria 🇳🇬*
