// ════════════════════════════════════════════════════════════════════════════
//  TUNEZ9JA — Nigerian AI Party DJ Brain
//  Understands Nigerian music culture, party timelines, crowd energy,
//  and transitions. Every song selection is intentional.
// ════════════════════════════════════════════════════════════════════════════

// ── Genre taxonomy ──────────────────────────────────────────────────────────
export const GENRES = {
  AFROBEATS:    { id:'afrobeats',   label:'Afrobeats',      energy:[55,95], bpm:[90,115], vibe:'dance' },
  AFROPOP:      { id:'afropop',     label:'Afropop',        energy:[50,85], bpm:[85,110], vibe:'dance' },
  STREET_POP:   { id:'street_pop',  label:'Street Pop',     energy:[65,95], bpm:[95,120], vibe:'hype'  },
  AMAPIANO:     { id:'amapiano',    label:'Amapiano',       energy:[50,85], bpm:[110,130],vibe:'groove' },
  AFRO_FUSION:  { id:'afro_fusion', label:'Afro Fusion',    energy:[45,80], bpm:[80,110], vibe:'chill' },
  FUJI:         { id:'fuji',        label:'Fuji',           energy:[60,90], bpm:[100,130],vibe:'traditional' },
  HIGHLIFE:     { id:'highlife',    label:'Highlife',       energy:[45,75], bpm:[80,105], vibe:'classic' },
  IGBO_HIGHLIFE:{ id:'igbo_hl',     label:'Igbo Highlife',  energy:[50,80], bpm:[85,110], vibe:'classic' },
  APALA:        { id:'apala',       label:'Apala',          energy:[40,70], bpm:[75,100], vibe:'traditional' },
  HIP_HOP:      { id:'hiphop',      label:'Hip Hop',        energy:[55,90], bpm:[80,100], vibe:'rap' },
  TRAP:         { id:'trap',        label:'Trap',           energy:[60,90], bpm:[120,165],vibe:'hype' },
  DRILL:        { id:'drill',       label:'Drill',          energy:[65,90], bpm:[130,145],vibe:'hype' },
  DANCEHALL:    { id:'dancehall',   label:'Dancehall',      energy:[60,90], bpm:[60,80],  vibe:'dance' },
  REGGAE:       { id:'reggae',      label:'Reggae',         energy:[35,65], bpm:[60,80],  vibe:'chill' },
  RNB:          { id:'rnb',         label:'R&B',            energy:[35,65], bpm:[70,90],  vibe:'romance' },
  GOSPEL:       { id:'gospel',      label:'Gospel',         energy:[50,85], bpm:[70,110], vibe:'worship' },
  HAUSA:        { id:'hausa',       label:'Hausa Music',    energy:[40,75], bpm:[70,100], vibe:'traditional' },
  YORUBA:       { id:'yoruba',      label:'Yoruba Classics', energy:[45,80], bpm:[75,105], vibe:'classic' },
  OLDSCHOOL:    { id:'oldschool',   label:'Old School Naija',energy:[50,85], bpm:[80,110], vibe:'nostalgia' },
  CONTEMPORARY: { id:'contemporary',label:'Contemporary',   energy:[55,90], bpm:[85,120], vibe:'dance' },
  GHANAIAN:     { id:'ghanaian',    label:'Ghanaian',       energy:[50,85], bpm:[85,115], vibe:'dance' },
  SA_AMAPIANO:  { id:'sa_amapiano', label:'SA Amapiano',    energy:[55,85], bpm:[110,130],vibe:'groove' },
  INTERNATIONAL:{ id:'international',label:'International', energy:[45,85], bpm:[80,130], vibe:'dance' },
}

// ── Event types with recommended strategies ──────────────────────────────────
export const EVENT_TYPES = {
  wedding:       { label:'Wedding',        openEnergy:25, peakEnergy:80, closingEnergy:50, genres:['afrobeats','highlife','rnb','afropop','igbo_hl'], allowExplicit:false },
  birthday:      { label:'Birthday Party', openEnergy:35, peakEnergy:95, closingEnergy:60, genres:['afrobeats','street_pop','afropop','hiphop','amapiano'], allowExplicit:true  },
  club:          { label:'Club Night',     openEnergy:55, peakEnergy:100,closingEnergy:40, genres:['afrobeats','amapiano','street_pop','trap','drill'],   allowExplicit:true  },
  house_party:   { label:'House Party',    openEnergy:40, peakEnergy:90, closingEnergy:55, genres:['afrobeats','afropop','rnb','amapiano','hiphop'],      allowExplicit:true  },
  lounge:        { label:'Lounge',         openEnergy:25, peakEnergy:65, closingEnergy:35, genres:['rnb','afro_fusion','afropop','reggae','contemporary'], allowExplicit:false },
  pool_party:    { label:'Pool Party',     openEnergy:50, peakEnergy:90, closingEnergy:50, genres:['afrobeats','amapiano','dancehall','afropop'],          allowExplicit:true  },
  road_trip:     { label:'Road Trip',      openEnergy:45, peakEnergy:80, closingEnergy:50, genres:['afrobeats','afropop','oldschool','hiphop','rnb'],      allowExplicit:true  },
  gym:           { label:'Gym Session',    openEnergy:65, peakEnergy:100,closingEnergy:50, genres:['trap','drill','street_pop','amapiano','hiphop'],       allowExplicit:true  },
  beach:         { label:'Beach Party',    openEnergy:45, peakEnergy:85, closingEnergy:40, genres:['afrobeats','dancehall','reggae','afropop','sa_amapiano'],allowExplicit:true },
  campus:        { label:'Campus Party',   openEnergy:45, peakEnergy:95, closingEnergy:50, genres:['afrobeats','street_pop','amapiano','hiphop','trap'],   allowExplicit:true  },
  traditional:   { label:'Traditional',   openEnergy:30, peakEnergy:75, closingEnergy:45, genres:['fuji','apala','yoruba','hausa','igbo_hl','highlife'],  allowExplicit:false },
  christmas:     { label:'Christmas',      openEnergy:40, peakEnergy:85, closingEnergy:60, genres:['afrobeats','gospel','afropop','oldschool','rnb'],      allowExplicit:false },
  detty_dec:     { label:'Detty December', openEnergy:60, peakEnergy:100,closingEnergy:55, genres:['afrobeats','amapiano','street_pop','afropop'],         allowExplicit:true  },
  corporate:     { label:'Corporate',      openEnergy:20, peakEnergy:55, closingEnergy:30, genres:['afropop','highlife','rnb','afro_fusion','contemporary'],allowExplicit:false },
  dinner:        { label:'Dinner',         openEnergy:15, peakEnergy:45, closingEnergy:25, genres:['rnb','highlife','afro_fusion','reggae','afropop'],     allowExplicit:false },
  church:        { label:'Church',         openEnergy:30, peakEnergy:75, closingEnergy:50, genres:['gospel'],                                             allowExplicit:false },
  family:        { label:'Family',         openEnergy:25, peakEnergy:65, closingEnergy:40, genres:['afropop','oldschool','highlife','gospel','afrobeats'], allowExplicit:false },
  new_year:      { label:'New Year',       openEnergy:55, peakEnergy:100,closingEnergy:70, genres:['afrobeats','amapiano','street_pop','afropop'],         allowExplicit:true  },
  general:       { label:'General',        openEnergy:35, peakEnergy:85, closingEnergy:45, genres:['afrobeats','afropop','amapiano','rnb','hiphop'],       allowExplicit:true  },
}

// ── Party stages ─────────────────────────────────────────────────────────────
export const STAGE = {
  ARRIVAL:    { id:'arrival',    label:'Arrival',    pct:[0,0.15],   energyTarget:25 },
  WARM_UP:    { id:'warm_up',    label:'Warm Up',    pct:[0.15,0.35],energyTarget:55 },
  PEAK:       { id:'peak',       label:'Peak Hour',  pct:[0.35,0.75],energyTarget:90 },
  RECOVERY:   { id:'recovery',   label:'Recovery',   pct:[0.75,0.85],energyTarget:70 },
  CLOSING:    { id:'closing',    label:'Closing',    pct:[0.85,1],   energyTarget:50 },
}

// ── Key compatibility table (Camelot wheel) ──────────────────────────────────
// Keys that mix well together
const CAMELOT_COMPAT = {
  '1A':  ['1A','12A','2A','1B'],
  '2A':  ['2A','1A','3A','2B'],
  '3A':  ['3A','2A','4A','3B'],
  '4A':  ['4A','3A','5A','4B'],
  '5A':  ['5A','4A','6A','5B'],
  '6A':  ['6A','5A','7A','6B'],
  '7A':  ['7A','6A','8A','7B'],
  '8A':  ['8A','7A','9A','8B'],
  '9A':  ['9A','8A','10A','9B'],
  '10A': ['10A','9A','11A','10B'],
  '11A': ['11A','10A','12A','11B'],
  '12A': ['12A','11A','1A','12B'],
  '1B':  ['1B','12B','2B','1A'],
  '2B':  ['2B','1B','3B','2A'],
  '3B':  ['3B','2B','4B','3A'],
  '4B':  ['4B','3B','5B','4A'],
  '5B':  ['5B','4B','6B','5A'],
  '6B':  ['6B','5B','7B','6A'],
  '7B':  ['7B','6B','8B','7A'],
  '8B':  ['8B','7B','9B','8A'],
  '9B':  ['9B','8B','10B','9A'],
  '10B': ['10B','9B','11B','10A'],
  '11B': ['11B','10B','12B','11A'],
  '12B': ['12B','11B','1B','12A'],
}

// ── Compute track energy from available fields ───────────────────────────────
export function inferTrackEnergy(track) {
  if (track.energy_score) return track.energy_score
  // Infer from genre + title hints
  const genre = (track.genre || '').toLowerCase()
  const title = (track.title || '').toLowerCase()
  let base = 60
  if (genre.includes('trap') || genre.includes('drill')) base = 78
  else if (genre.includes('amapiano')) base = 72
  else if (genre.includes('afrobeats') || genre.includes('street')) base = 70
  else if (genre.includes('highlife') || genre.includes('rnb')) base = 50
  else if (genre.includes('reggae') || genre.includes('gospel')) base = 45
  else if (genre.includes('fuji') || genre.includes('apala')) base = 65
  // Title hints
  if (/party|dance|vibes|banger|turn up/.test(title)) base += 10
  if (/love|slow|miss|cry|pain/.test(title)) base -= 15
  if (/soro|soke|omo|shaku|gbese/.test(title)) base += 8
  return Math.max(10, Math.min(100, base + (Math.random() * 10 - 5)))
}

export function inferBPM(track) {
  if (track.bpm) return track.bpm
  const genre = (track.genre || '').toLowerCase()
  if (genre.includes('trap') || genre.includes('drill')) return 130 + Math.random() * 20
  if (genre.includes('amapiano')) return 112 + Math.random() * 10
  if (genre.includes('afrobeats')) return 95 + Math.random() * 15
  if (genre.includes('dancehall')) return 68 + Math.random() * 10
  if (genre.includes('reggae')) return 68 + Math.random() * 8
  if (genre.includes('highlife')) return 90 + Math.random() * 15
  if (genre.includes('rnb')) return 78 + Math.random() * 12
  return 90 + Math.random() * 20
}

// ── Transition score between two tracks (0-100) ──────────────────────────────
export function transitionScore(from, to) {
  if (!from || !to) return 50
  let score = 50

  // BPM compatibility (±10 BPM = perfect, ±20 = ok, beyond = jarring)
  const bpmFrom = inferBPM(from)
  const bpmTo   = inferBPM(to)
  const bpmDiff = Math.abs(bpmFrom - bpmTo)
  if (bpmDiff <= 5)  score += 25
  else if (bpmDiff <= 10) score += 18
  else if (bpmDiff <= 20) score += 8
  else if (bpmDiff > 40)  score -= 20

  // Key compatibility
  const k1 = from.camelot_key, k2 = to.camelot_key
  if (k1 && k2) {
    if (k1 === k2) score += 20
    else if (CAMELOT_COMPAT[k1] && CAMELOT_COMPAT[k1].includes(k2)) score += 12
  }

  // Energy compatibility (gradual changes are better)
  const e1 = inferTrackEnergy(from)
  const e2 = inferTrackEnergy(to)
  const eDiff = Math.abs(e1 - e2)
  if (eDiff <= 10) score += 15
  else if (eDiff <= 20) score += 8
  else if (eDiff > 40) score -= 15

  // Genre compatibility
  const g1 = (from.genre || '').toLowerCase()
  const g2 = (to.genre || '').toLowerCase()
  if (g1 === g2) score += 12
  else if (sameFamily(g1, g2)) score += 6

  // Same artist = risky (play too much of same artist = boring)
  if (from.artist_id && from.artist_id === to.artist_id) score -= 10

  return Math.max(0, Math.min(100, score))
}

function sameFamily(g1, g2) {
  const families = [
    ['afrobeats','afropop','afro_fusion','street_pop','contemporary'],
    ['amapiano','sa_amapiano'],
    ['hiphop','trap','drill'],
    ['reggae','dancehall'],
    ['fuji','apala','yoruba'],
    ['highlife','igbo_hl'],
    ['rnb','afro_fusion'],
  ]
  return families.some(f => f.some(x => g1.includes(x)) && f.some(x => g2.includes(x)))
}

// ── Get current party stage based on session progress ────────────────────────
export function getStage(sessionProgress) {
  // sessionProgress = 0-1 (how far through the session we are)
  for (const s of Object.values(STAGE)) {
    if (sessionProgress >= s.pct[0] && sessionProgress < s.pct[1]) return s
  }
  return STAGE.CLOSING
}

// ── Detect time-of-day context ────────────────────────────────────────────────
export function getTimeContext() {
  const h = new Date().getHours()
  if (h >= 6  && h < 10) return { period:'morning',  label:'Morning',       energyMod:-10, vibes:['chill','gospel','afropop'] }
  if (h >= 10 && h < 13) return { period:'midday',   label:'Midday',        energyMod:0,   vibes:['afrobeats','contemporary'] }
  if (h >= 13 && h < 17) return { period:'afternoon',label:'Afternoon',     energyMod:+5,  vibes:['afrobeats','amapiano'] }
  if (h >= 17 && h < 20) return { period:'evening',  label:'Evening',       energyMod:+10, vibes:['afrobeats','rnb','afropop'] }
  if (h >= 20 && h < 23) return { period:'night',    label:'Night',         energyMod:+20, vibes:['afrobeats','street_pop','amapiano'] }
  return                         { period:'latenight',label:'Late Night',    energyMod:+15, vibes:['amapiano','afrobeats','trap'] }
}

// ── User behaviour model ──────────────────────────────────────────────────────
export class UserBehaviourModel {
  constructor() {
    this.skips        = {}   // trackId → skip count
    this.replays      = {}   // trackId → replay count
    this.completions  = {}   // trackId → completion count
    this.genreScores  = {}   // genre → weighted score
    this.skipStreak   = 0    // consecutive skips (crowd losing interest signal)
    this.totalPlayed  = 0
    this.sessionStart = Date.now()
  }

  recordSkip(track, positionPct) {
    const id = track.id
    this.skips[id] = (this.skips[id] || 0) + 1
    this.skipStreak++
    // Early skip = strong dislike signal
    if (positionPct < 0.2) {
      this.penalizeGenre(track.genre, 15)
    } else {
      this.penalizeGenre(track.genre, 5)
    }
    this._persist()
  }

  recordCompletion(track) {
    const id = track.id
    this.completions[id] = (this.completions[id] || 0) + 1
    this.skipStreak = 0
    this.totalPlayed++
    this.boostGenre(track.genre, 10)
    this._persist()
  }

  recordReplay(track) {
    this.replays[track.id] = (this.replays[track.id] || 0) + 1
    this.boostGenre(track.genre, 20)
    this._persist()
  }

  boostGenre(genre, amt) {
    if (!genre) return
    const g = genre.toLowerCase()
    this.genreScores[g] = Math.min(100, (this.genreScores[g] || 50) + amt)
  }

  penalizeGenre(genre, amt) {
    if (!genre) return
    const g = genre.toLowerCase()
    this.genreScores[g] = Math.max(0, (this.genreScores[g] || 50) - amt)
  }

  getGenreAffinity(genre) {
    return this.genreScores[(genre || '').toLowerCase()] ?? 50
  }

  isCrowdLosingInterest() {
    return this.skipStreak >= 3
  }

  getSessionProgress(estimatedDuration = 120) {
    const minutesElapsed = (Date.now() - this.sessionStart) / 60000
    return Math.min(1, minutesElapsed / estimatedDuration)
  }

  _persist() {
    try {
      localStorage.setItem('t9_dj_behaviour', JSON.stringify({
        skips: this.skips, replays: this.replays,
        completions: this.completions, genreScores: this.genreScores,
      }))
    } catch {}
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem('t9_dj_behaviour') || '{}')
      this.skips       = d.skips       ? d.skips       : {}
      this.replays     = d.replays     ? d.replays     : {}
      this.completions = d.completions ? d.completions : {}
      this.genreScores = d.genreScores ? d.genreScores : {}
    } catch {}
    return this
  }
}

// ── Main DJ scoring engine ────────────────────────────────────────────────────
export class DJBrain {
  constructor() {
    this.behaviour     = new UserBehaviourModel().load()
    this.eventType     = 'general'
    this.sessionMinutes= 120
    this.playHistory   = []   // last N track ids
    this.energyHistory = []   // last N energy values
    this.recentArtists = []   // avoid back-to-back same artist
  }

  configure(eventType, sessionMinutes = 120) {
    this.eventType      = eventType
    this.sessionMinutes = sessionMinutes
  }

  // ── Score a candidate track for the next slot ────────────────────────────
  scoreTrack(track, context = {}) {
    const { currentEnergy = 60, targetEnergy = 60, currentTrack = null, stage = STAGE.PEAK } = context
    const event  = EVENT_TYPES[this.eventType] || EVENT_TYPES.general
    const time   = getTimeContext()
    let score    = 50

    // ── 1. Energy fit ─────────────────────────────────────────────────────
    const trackEnergy = inferTrackEnergy(track)
    const energyDiff  = Math.abs(trackEnergy - targetEnergy)
    if (energyDiff <= 5)  score += 30
    else if (energyDiff <= 15) score += 18
    else if (energyDiff <= 25) score += 8
    else if (energyDiff > 40)  score -= 25

    // ── 2. Transition score from current track ───────────────────────────
    if (currentTrack) {
      const ts = transitionScore(currentTrack, track)
      score += (ts - 50) * 0.4   // ±20 pts
    }

    // ── 3. Genre affinity ─────────────────────────────────────────────────
    const genreScore = this.behaviour.getGenreAffinity(track.genre)
    score += (genreScore - 50) * 0.3   // ±15 pts

    // ── 4. Event type fit ─────────────────────────────────────────────────
    const genre = (track.genre || '').toLowerCase()
    const eventGenres = event.genres || []
    if (eventGenres.some(g => genre.includes(g))) score += 15
    if (track.explicit && !event.allowExplicit)   score -= 30

    // ── 5. Never skipped / recently replayed boost ───────────────────────
    const skips    = this.behaviour.skips[track.id] || 0
    const replays  = this.behaviour.replays[track.id] || 0
    const completes= this.behaviour.completions[track.id] || 0
    score -= skips   * 12
    score += replays * 15
    score += completes * 5

    // ── 6. Avoid repeat plays (last 10 tracks) ───────────────────────────
    const recentIdx = this.playHistory.indexOf(track.id)
    if (recentIdx !== -1) {
      score -= (10 - recentIdx) * 8   // recently played = big penalty
    }

    // ── 7. Avoid back-to-back same artist ────────────────────────────────
    if (this.recentArtists.slice(0, 2).includes(track.artist_id)) score -= 20
    if (this.recentArtists.slice(0, 1).includes(track.artist_id)) score -= 30

    // ── 8. Stage-specific modifiers ──────────────────────────────────────
    if (stage.id === 'arrival') {
      if (trackEnergy > 70) score -= 20  // No bangers on arrival
      if (track.danceability > 0.8) score -= 10
    }
    if (stage.id === 'peak') {
      if (trackEnergy < 60) score -= 25  // No slow songs at peak
      if (track.popularity_score > 70) score += 10
    }
    if (stage.id === 'closing') {
      if (track.nostalgia_score > 60) score += 15  // Sing-alongs at close
      if (track.valence > 0.7)        score += 8
    }

    // ── 9. Time of day modifier ──────────────────────────────────────────
    const timeVibes = time.vibes || []
    if (timeVibes.some(v => genre.includes(v))) score += 8

    // ── 10. Recovery mode — crowd losing interest ────────────────────────
    if (context.crowdLostInterest) {
      if (track.popularity_score > 75) score += 25  // guaranteed crowd fave
      if (track.replay_score > 70)     score += 15
    }

    // ── 11. Popularity & viral boost (weighted by stage) ─────────────────
    const pop   = track.popularity_score || 50
    const viral = track.viral_score      || 50
    if (stage.id === 'peak') {
      score += (pop - 50) * 0.25
      score += (viral - 50) * 0.15
    } else {
      score += (pop - 50) * 0.1
    }

    // ── 12. Premium tracks slight boost (reward artists) ─────────────────
    if (!track.is_premium) score += 3

    return Math.max(0, Math.min(100, score))
  }

  // ── Select next track from catalogue ────────────────────────────────────
  selectNext(catalogue, context = {}) {
    if (!catalogue || catalogue.length === 0) return null
    const event    = EVENT_TYPES[this.eventType] || EVENT_TYPES.general
    const progress = this.behaviour.getSessionProgress(this.sessionMinutes)
    const stage    = getStage(progress)
    const time     = getTimeContext()

    // Determine target energy for this moment
    let targetEnergy = this._getTargetEnergy(stage, event, progress)

    // If crowd is losing interest, spike energy
    const crowdLostInterest = this.behaviour.isCrowdLosingInterest()
    if (crowdLostInterest) targetEnergy = Math.min(100, targetEnergy + 20)

    const fullContext = {
      ...context,
      targetEnergy,
      stage,
      currentEnergy: this.energyHistory.length
        ? this.energyHistory[this.energyHistory.length - 1]
        : targetEnergy,
      crowdLostInterest,
    }

    // Score all candidates
    const scored = catalogue.map(t => ({
      track: t,
      score: this.scoreTrack(t, fullContext),
    }))

    // Sort by score, add weighted randomness (top 5 compete)
    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, 5)

    // Weighted random selection among top picks (not always #1 — keeps it fresh)
    const totalWeight = top.reduce((s, t) => s + t.score, 0)
    let rand = Math.random() * totalWeight
    for (const candidate of top) {
      rand -= candidate.score
      if (rand <= 0) return { track: candidate.track, stage, targetEnergy, crowdLostInterest }
    }
    return { track: top[0].track, stage, targetEnergy, crowdLostInterest }
  }

  // ── Record that a track was played ──────────────────────────────────────
  trackPlayed(track) {
    this.playHistory.unshift(track.id)
    if (this.playHistory.length > 15) this.playHistory.pop()
    this.recentArtists.unshift(track.artist_id)
    if (this.recentArtists.length > 5) this.recentArtists.pop()
    this.energyHistory.push(inferTrackEnergy(track))
    if (this.energyHistory.length > 10) this.energyHistory.shift()
  }

  // ── Target energy curve based on stage ──────────────────────────────────
  _getTargetEnergy(stage, event, progress) {
    const timeCtx = getTimeContext()
    const base = {
      arrival: event.openEnergy    || 25,
      warm_up: event.openEnergy + 25 || 50,
      peak:    event.peakEnergy    || 90,
      recovery:event.peakEnergy - 20 || 70,
      closing: event.closingEnergy || 50,
    }[stage.id] || 60
    return Math.max(10, Math.min(100, base + timeCtx.energyMod))
  }

  // ── Calculate optimal crossfade duration (seconds) ──────────────────────
  getCrossfadeDuration(from, to) {
    if (!from || !to) return 3
    const ts = transitionScore(from, to)
    if (ts >= 80) return 6   // Smooth blend
    if (ts >= 60) return 4   // Normal crossfade
    if (ts >= 40) return 2   // Quick cut
    return 1                 // Hard cut (incompatible tracks)
  }

  // ── DJ Commentary (what a real DJ would announce) ────────────────────────
  getDJComment(track, stage, event) {
    const stageComments = {
      arrival:  ['Setting the vibe 🎵', 'Welcome, make yourself comfortable', 'The party is loading...'],
      warm_up:  ['It\'s warming up! 🔥', 'We\'re getting started!', 'Let\'s get this going!'],
      peak:     ['This is it! 🔥🔥', 'EVERYBODY ON THE FLOOR!', 'Peak hour, no slow songs!', 'DJ don\'t stop!'],
      recovery: ['Catch your breath, we coming back!', 'Not yet, we\'re recovering...'],
      closing:  ['Last songs for the night 🎶', 'Sing along everybody!', 'We can\'t end without this one'],
    }
    const comments = stageComments[stage.id] || stageComments.peak
    return comments[Math.floor(Math.random() * comments.length)]
  }
}

// Singleton instance
export const djBrain = new DJBrain()
