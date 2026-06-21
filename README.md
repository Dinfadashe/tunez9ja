# 🎵 Tunez9ja Entertainment

> Nigeria's Premier Music Blog — Est. 2021

A full-featured music blog and entertainment platform built with React + Vite.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

Open `http://localhost:5173` in your browser.

---

## 🔑 Demo Login Credentials

| Role     | Email                       | Password   |
|----------|-----------------------------|------------|
| Admin    | admin@tunez9ja.com          | admin123   |
| Artist 1 | burna@tunez9ja.com          | artist123  |
| Artist 2 | davido@tunez9ja.com         | artist123  |
| Blogger 1| blogger@tunez9ja.com        | blog123    |
| Blogger 2| zara@tunez9ja.com           | blog123    |

> **Quick access:** On the login page, use the demo buttons to auto-fill credentials.

---

## 🧩 Features

### Public Site
- 🏠 **Home** — Hero section, featured music, latest blog posts, CTA
- 🎵 **Music Page** — Browse & stream approved tracks, genre filter, search, now-playing bar
- 📰 **Blog Page** — Read approved posts, category filter, full article view
- ℹ️ **About Page** — Platform story and stats

### Admin Dashboard (`/admin-dashboard`)
- 📊 **Overview** — Stats: artists, bloggers, pending items, published content
- 🎵 **Music Review** — Approve / reject / delete artist submissions with feedback notes
- 📝 **Blog Review** — Approve / reject / delete blogger posts with feedback
- 👥 **User Management** — View all users, verify/unverify artists

### Artist Dashboard (`/artist-dashboard`)
- 📊 **Overview** — Track stats, upload CTA
- 🎵 **My Music** — See all submitted tracks with status and admin feedback
- ⬆️ **Upload Track** — Submit audio + cover art for review
- 👤 **Profile** — Edit stage name, genre, bio

### Blogger Dashboard (`/blogger-dashboard`)
- 📊 **Overview** — Post stats and recent activity
- 📝 **My Posts** — View, edit, delete all posts; see admin feedback
- ✍️ **Write Post** — Rich post submission form with category, excerpt, full content
- 👤 **Profile** — Edit display name and bio

---

## 🏗️ Tech Stack

| Layer        | Technology                |
|--------------|---------------------------|
| Framework    | React 18 + Vite 5         |
| Routing      | Single-page state router  |
| State        | React Context + useState  |
| Styling      | Pure CSS (design system)  |
| Icons        | Lucide React              |
| Fonts        | Bebas Neue + Inter + Space Mono |
| Data         | In-memory (seed data)     |

---

## 📁 Project Structure

```
tunez9ja/
├── public/
│   └── logo.png               # Tunez9ja logo
├── src/
│   ├── components/
│   │   ├── UI.jsx             # Shared UI: Modal, Toast, Avatar, etc.
│   │   ├── Navbar.jsx         # Public navigation bar
│   │   ├── Footer.jsx         # Public footer
│   │   └── Sidebar.jsx        # Dashboard sidebar
│   ├── context/
│   │   └── AppContext.jsx     # Global state, auth, data store
│   ├── pages/
│   │   ├── Home.jsx           # Public home page
│   │   ├── Music.jsx          # Public music streaming page
│   │   ├── Blog.jsx           # Public blog listing + article view
│   │   ├── About.jsx          # About page
│   │   ├── Auth.jsx           # Login + Register pages
│   │   ├── AdminDashboard.jsx # Admin portal (all sections)
│   │   ├── ArtistDashboard.jsx# Artist portal (all sections)
│   │   └── BloggerDashboard.jsx# Blogger portal (all sections)
│   ├── styles/
│   │   └── global.css         # Full design system CSS
│   ├── App.jsx                # Root component + page router
│   └── main.jsx               # Entry point
├── index.html
├── vite.config.js
└── package.json
```

---

## 🔄 Content Workflow

```
Artist uploads track  →  Status: PENDING  →  Admin reviews  →  APPROVED (public) or REJECTED (with note)
Blogger submits post  →  Status: PENDING  →  Admin reviews  →  APPROVED (public) or REJECTED (with note)
```

- Pending content is **never shown** on the public site
- Rejected items show admin feedback to the creator
- Artists/bloggers can re-submit after editing

---

## 🌐 Deploying to Production

### Netlify (recommended)
1. Push code to GitHub
2. Connect repo to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`

### Backend Integration
To connect a real backend, replace the in-memory store in `src/context/AppContext.jsx` with API calls to Supabase, Firebase, or your own REST API.

---

## 📞 Contact

**Tunez9ja Entertainment**  
Email: info@tunez9ja.com  
Instagram: @tunez9ja  
Twitter/X: @tunez9ja  

---

*Built with ❤️ for Nigerian music culture*
