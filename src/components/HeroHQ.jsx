// src/components/HeroHQ.jsx
// ─────────────────────────────────────────────────────────────────────────────
// "Tunez9ja HQ" — the home of music, drawn as a futuristic headquarters.
//  • The logo is used exactly as it is (/logo.png, untouched) as the crest
//    in the gable.
//  • The windows are an equalizer. At rest after the entrance, the building is
//    still; while music plays it comes alive (equalizer, turning crest ring,
//    broadcasting spire, sound ripples, searchlights).
//  • Respects "reduce motion".
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'

// Equalizer windows: x and resting height above the floor line (y = 456)
const BARS = [
  { x: 138, h: 78 }, { x: 164, h: 128 }, { x: 190, h: 100 }, { x: 216, h: 146 },
  { x: 326, h: 136 }, { x: 352, h: 96 }, { x: 378, h: 152 }, { x: 404, h: 86 },
]

export default function HeroHQ() {
  const { isPlaying } = usePlayer()
  return (
    <figure className={`hq ${isPlaying ? 'hq--live' : ''}`} aria-label="Tunez9ja headquarters, a home for music">
      <svg viewBox="0 0 560 560" role="img" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hqBeam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#c8102e" stopOpacity="0.35" />
            <stop offset="1" stopColor="#c8102e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hqGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f0f13" />
            <stop offset="1" stopColor="#0c0a0b" />
          </linearGradient>
          <linearGradient id="hqGable" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c0c14" />
            <stop offset="1" stopColor="#140c0e" />
          </linearGradient>
          <linearGradient id="hqBar" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#c8102e" stopOpacity="0.3" />
            <stop offset="0.75" stopColor="#c8102e" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ff5470" />
          </linearGradient>
          <linearGradient id="hqDoorLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hqReflect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <mask id="hqReflectMask"><rect x="0" y="484" width="560" height="70" fill="url(#hqReflect)" /></mask>
          <radialGradient id="hqHalo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#c8102e" stopOpacity="0.5" />
            <stop offset="1" stopColor="#c8102e" stopOpacity="0" />
          </radialGradient>
          <filter id="hqGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <clipPath id="hqFacade"><rect x="120" y="250" width="320" height="218" /></clipPath>
        </defs>

        {/* Searchlights crossing behind the HQ */}
        <g className="hq-beams">
          <path className="hq-beam hq-beam--l" d="M188 468 L196 468 L74 0 L-6 0 Z" fill="url(#hqBeam)" />
          <path className="hq-beam hq-beam--r" d="M364 468 L372 468 L566 0 L486 0 Z" fill="url(#hqBeam)" />
        </g>

        {/* Sound ripples on the ground */}
        <g className="hq-ripples" transform="translate(280 486)">
          <ellipse rx="250" ry="30" /><ellipse rx="250" ry="30" /><ellipse rx="250" ry="30" />
        </g>

        {/* Reflection under the slab */}
        <g mask="url(#hqReflectMask)" opacity="0.18" transform="matrix(1 0 0 -0.42 0 680)">
          {BARS.map((b, i) => <rect key={i} x={b.x} y={456 - b.h} width="18" height={b.h} rx="3" fill="#c8102e" />)}
        </g>

        {/* Slab */}
        <path d="M58 468 L502 468 L484 484 L76 484 Z" fill="#171214" />
        <line x1="58" y1="468" x2="502" y2="468" stroke="#c8102e" strokeWidth="2.5" />

        {/* Door light on the slab */}
        <path className="hq-doorlight" d="M256 468 L304 468 L344 506 L216 506 Z" fill="url(#hqDoorLight)" />

        {/* Side canopies */}
        <path d="M62 372 L120 372 L120 380 L70 380 Z" fill="#221a1d" />
        <path d="M498 372 L440 372 L440 380 L490 380 Z" fill="#221a1d" />
        <line x1="62" y1="372" x2="120" y2="372" stroke="#c8102e" strokeWidth="2" />
        <line x1="440" y1="372" x2="498" y2="372" stroke="#c8102e" strokeWidth="2" />

        {/* Facade: dark glass, three floors */}
        <rect x="120" y="250" width="320" height="218" fill="url(#hqGlass)" stroke="#2f2427" />
        <g stroke="#2f2427"><line x1="120" y1="322" x2="440" y2="322" /><line x1="120" y1="392" x2="440" y2="392" /></g>

        {/* Equalizer windows */}
        <g clipPath="url(#hqFacade)">
          {BARS.map((b, i) => (
            <rect key={i} className="hq-bar" style={{ '--i': i }}
              x={b.x} y={456 - b.h} width="18" height={b.h} rx="3" fill="url(#hqBar)" />
          ))}
          {/* glint across the glass */}
          <path d="M150 250 L210 250 L120 468 L120 330 Z" fill="#ffffff" opacity="0.045" />
        </g>

        {/* Entrance */}
        <path d="M256 468 L256 414 Q256 392 280 392 Q304 392 304 414 L304 468 Z" fill="#f6f2f2" />
        <path d="M256 468 L256 414 Q256 392 280 392 Q304 392 304 414 L304 468" fill="none" stroke="#c8102e" strokeWidth="2" />

        {/* Gable */}
        <path d="M108 252 L280 98 L452 252 Z" fill="url(#hqGable)" />

        {/* Roof: a thick cantilevered slab with a neon edge */}
        <path className="hq-roofslab" d="M58 262 L280 64 L502 262 L470 262 L280 94 L90 262 Z" fill="#1c1013" />
        <path className="hq-roof hq-roof--glow" pathLength="1" d="M58 262 L280 64 L502 262" fill="none" stroke="#c8102e" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" filter="url(#hqGlow)" opacity="0.7" />
        <path className="hq-roof" pathLength="1" d="M58 262 L280 64 L502 262" fill="none" stroke="#c8102e" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        <path className="hq-roof hq-roof--inner" pathLength="1" d="M90 262 L280 94 L470 262" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" opacity="0.55" />

        {/* Broadcast spire */}
        <line x1="280" y1="64" x2="280" y2="14" stroke="#5a5a5a" strokeWidth="3" strokeLinecap="round" />
        <line x1="272" y1="40" x2="288" y2="40" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round" />
        <line x1="275" y1="28" x2="285" y2="28" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round" />
        <circle className="hq-beacon" cx="280" cy="11" r="5" fill="#c8102e" />

        {/* Crest: the logo, unchanged */}
        <circle className="hq-halo" cx="280" cy="188" r="86" fill="url(#hqHalo)" />
        <circle className="hq-ring" cx="280" cy="188" r="68" fill="none" stroke="#c8102e" strokeWidth="1.5" strokeDasharray="3 9" opacity="0.85" />
        <image className="hq-logo" href="/logo.png" x="224" y="132" width="112" height="112" preserveAspectRatio="xMidYMid meet" />
      </svg>
    </figure>
  )
}
