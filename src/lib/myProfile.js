// src/lib/myProfile.js
// One request for "my profile" even when the app shell and a dashboard both
// ask for it at the same moment. Results are reused for a few seconds only,
// so edits still show up straight away on the next load.
import { supabase } from './supabase.js'

let inflight = null
let last = null
let lastAt = 0

export function fetchMyProfile({ maxAgeMs = 3000 } = {}) {
  if (inflight) return inflight
  if (last && Date.now() - lastAt < maxAgeMs) return Promise.resolve({ data: last, error: null })
  inflight = supabase.rpc('my_profile').maybeSingle().then(
    (res) => {
      inflight = null
      if (!res.error) { last = res.data; lastAt = Date.now() }
      return res
    },
    (err) => { inflight = null; throw err },
  )
  return inflight
}

export function forgetMyProfile() { last = null; lastAt = 0 }
