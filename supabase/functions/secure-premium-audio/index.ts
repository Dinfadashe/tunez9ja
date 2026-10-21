// Supabase Edge Function: secure-premium-audio
// Keeps premium audio private (BugBunny finding #3):
//   premium tracks whose file is in the PUBLIC 'music-audio' bucket are moved
//   to the PRIVATE 'music-premium' bucket (and free tracks moved back).
//   Moving changes the file's address, so previously leaked public links die.
// Admins secure every track; an artist calling it only moves their own.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!
const PUBLIC_BUCKET = 'music-audio'
const PREMIUM_BUCKET = 'music-premium'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const pathIn = (url: string, bucket: string) => {
  const m = String(url || '').match(new RegExp(`/${bucket}/([^?#]+)`))
  return m ? decodeURIComponent(m[1]) : null
}

async function moveObject(from: string, to: string, path: string): Promise<string | null> {
  const auth = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
  // 1) Native cross-bucket move
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/move`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: from, sourceKey: path, destinationKey: path, destinationBucket: to }),
  })
  if (r.ok) return null
  // 2) Fallback: copy then delete
  const dl = await fetch(`${SUPABASE_URL}/storage/v1/object/${from}/${path}`, { headers: auth })
  if (!dl.ok) return `download failed (${dl.status})`
  const type = dl.headers.get('content-type') || 'audio/mpeg'
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${to}/${path}`, {
    method: 'POST', headers: { ...auth, 'Content-Type': type, 'x-upsert': 'true' }, body: await dl.arrayBuffer(),
  })
  if (!up.ok) return `upload failed (${up.status})`
  const del = await fetch(`${SUPABASE_URL}/storage/v1/object/${from}`, {
    method: 'DELETE', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }),
  })
  return del.ok ? null : `copied but old file not deleted (${del.status})`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ success: false, reason: 'Method not allowed' }, 405)

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user } } = await userClient.auth.getUser(token)
  if (!user) return json({ success: false, reason: 'Please sign in' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: prof } = await admin.from('profiles').select('role, available_roles').eq('id', user.id).maybeSingle()
  const isAdmin = prof?.role === 'admin' || (prof?.available_roles || []).includes('admin')

  let q = admin.from('music_tracks').select('id, artist_id, audio_url, is_premium')
    .or(`and(is_premium.eq.true,audio_url.like.*/${PUBLIC_BUCKET}/*),and(is_premium.eq.false,audio_url.like.*/${PREMIUM_BUCKET}/*)`)
  if (!isAdmin) q = q.eq('artist_id', user.id)
  const { data: tracks, error } = await q
  if (error) return json({ success: false, reason: error.message }, 500)

  const moved: string[] = [], failed: { id: string; reason: string }[] = []
  for (const t of tracks || []) {
    const toPrivate = t.is_premium
    const from = toPrivate ? PUBLIC_BUCKET : PREMIUM_BUCKET
    const to   = toPrivate ? PREMIUM_BUCKET : PUBLIC_BUCKET
    const path = pathIn(t.audio_url, from)
    if (!path) { failed.push({ id: t.id, reason: 'unrecognised audio URL' }); continue }
    const err = await moveObject(from, to, path)
    if (err && !err.startsWith('copied')) { failed.push({ id: t.id, reason: err }); continue }
    const newUrl = `${SUPABASE_URL}/storage/v1/object/public/${to}/${path}`
    const { error: upErr } = await admin.from('music_tracks').update({ audio_url: newUrl }).eq('id', t.id)
    if (upErr) { failed.push({ id: t.id, reason: 'moved but URL not updated: ' + upErr.message }); continue }
    moved.push(t.id)
    if (err) failed.push({ id: t.id, reason: err })
  }
  return json({ success: failed.length === 0, moved: moved.length, failed })
})
