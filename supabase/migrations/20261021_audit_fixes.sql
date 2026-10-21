-- ═══════════════════════════════════════════════════════════════════════════
-- Tunez9ja — fixes for the BugBunny audit (report 6F787CC6B08D, 2026-10-20)
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
--   0. Signup broken ("Database error saving new user") — hardened trigger
--   1. HIGH   notifications: anyone could read/forge/edit/delete any feed
--   2. MED    tunez_balances: anyone could read every wallet
--   3. MED    premium audio downloadable from the public bucket
--             → private bucket 'music-premium' + entitlement-checked access
--   4. LOW    admin views exposing creator emails (re-applied, admin-only)
--   6. LOW    play/view counts inflatable without an account
--   (5, account enumeration, is fixed in Supabase Auth settings — see notes
--    at the end; the Paystack cross-use is fixed in the edge function.)
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 0. Signup must never fail because of the referral code ─────────────────
-- Generates the code separately and retries on a clash, so creating the
-- profile can't be blocked by it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role_txt text := lower(coalesce(new.raw_user_meta_data->>'role', 'user'));
  v_role     public.user_role;
  v_avail    public.user_role[];
  v_name     text := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  v_code     text;
  i          int;
begin
  if v_role_txt not in ('user', 'artist', 'blogger') then
    v_role_txt := 'user';              -- never trust a role sent by the browser
  end if;
  v_role := v_role_txt::public.user_role;
  v_avail := case when v_role = 'user' then array['user'::public.user_role]
                  else array['user'::public.user_role, v_role] end;

  insert into public.profiles (id, name, email, role, active_role, available_roles, bio, genre)
  values (new.id, v_name, new.email, v_role, v_role, v_avail,
          new.raw_user_meta_data->>'bio', new.raw_user_meta_data->>'genre')
  on conflict (id) do update set
    active_role     = coalesce(profiles.active_role, excluded.active_role),
    available_roles = coalesce(profiles.available_roles, excluded.available_roles),
    name            = coalesce(profiles.name, excluded.name),
    bio             = coalesce(profiles.bio, excluded.bio),
    genre           = coalesce(profiles.genre, excluded.genre);

  -- Referral code: best effort, never blocks signup
  begin
    for i in 0..4 loop
      v_code := regexp_replace(upper(left(v_name, 4)), '[^A-Z]', 'X', 'g')
                || upper(substr(replace(new.id::text, '-', ''), 1 + i * 4, 4));
      begin
        update public.profiles set referral_code = v_code
         where id = new.id and (referral_code is null or referral_code = '');
        exit;
      exception when unique_violation then
        null;   -- try the next variant
      end;
    end loop;
  exception when others then
    raise warning 'referral code not set for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;


-- ── 1. Notifications: each user sees and manages only their own ────────────
alter table public.notifications enable row level security;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'notifications' loop
    execute format('drop policy %I on public.notifications', r.policyname);
  end loop;
end $$;

create policy "notifications: read own"   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications: update own" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: delete own" on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy "notifications: admin read" on public.notifications for select to authenticated using (public.is_admin(auth.uid()));
-- No INSERT policy: notifications are created only by the functions below
-- and by other SECURITY DEFINER functions (approvals, rejections…).

revoke all on public.notifications from anon;
revoke insert on public.notifications from authenticated;
grant select, update, delete on public.notifications to authenticated;

-- Users can't rewrite a notification's content or owner — only mark it read
create or replace function public.notifications_read_only_fields()
returns trigger language plpgsql as $$
declare
  j jsonb;
begin
  if current_user in ('anon', 'authenticated') then
    -- everything except is_read keeps its old value
    j := to_jsonb(old) || jsonb_build_object('is_read', to_jsonb(new) -> 'is_read');
    new := jsonb_populate_record(new, j);
  end if;
  return new;
end $$;
drop trigger if exists trg_notifications_read_only on public.notifications;
create trigger trg_notifications_read_only before update on public.notifications
  for each row execute function public.notifications_read_only_fields();

-- "X started following you" — the server writes the text (no phishing), only
-- for a follow that really exists, at most once per follower per day
create or replace function public.notify_new_follower(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_msg  text;
begin
  if v_uid is null or p_target is null or p_target = v_uid then return; end if;
  if not exists (select 1 from public.follows where follower_id = v_uid and following_id = p_target) then return; end if;
  select coalesce(nullif(name, ''), 'Someone') || ' started following you' into v_msg from public.profiles where id = v_uid;
  v_msg := coalesce(v_msg, 'Someone started following you');
  -- follow/unfollow/follow again shouldn't spam: once per follower per day
  if exists (select 1 from public.notifications
             where user_id = p_target and message = v_msg and created_at > now() - interval '1 day') then return; end if;
  begin
    insert into public.notifications (user_id, type, message, is_read) values (p_target, 'new_follower', v_msg, false);
  exception when others then
    insert into public.notifications (user_id, type, message, is_read) values (p_target, 'general', v_msg, false);
  end;
end $$;

-- Admin messages to a user (editor suspended/reinstated, etc.)
drop function if exists public.admin_notify(uuid, text, text);
create or replace function public.admin_notify(p_user_id uuid, p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can send notifications' using errcode = '42501';
  end if;
  insert into public.notifications (user_id, type, message, is_read)
  values (p_user_id, 'general', left(coalesce(p_message, ''), 1000), false);
end $$;

revoke execute on function public.notify_new_follower(uuid) from public, anon;
grant  execute on function public.notify_new_follower(uuid) to authenticated, service_role;
revoke execute on function public.admin_notify(uuid, text) from public, anon;
grant  execute on function public.admin_notify(uuid, text) to authenticated, service_role;


-- ── 2. Wallets: your own balance only; leaderboard shows earned totals only ─
alter table public.tunez_balances enable row level security;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'tunez_balances' loop
    execute format('drop policy %I on public.tunez_balances', r.policyname);
  end loop;
end $$;

create policy "tunez_balances: own read"   on public.tunez_balances for select to authenticated using (user_id = auth.uid());
create policy "tunez_balances: admin read" on public.tunez_balances for select to authenticated using (public.is_admin(auth.uid()));
create policy "tunez_balances: service"    on public.tunez_balances for all to service_role using (true) with check (true);
revoke all on public.tunez_balances from anon;

create or replace function public.tunez_leaderboard(p_limit int default 20)
returns table (user_id uuid, total_earned numeric, name text, avatar_url text, is_verified boolean)
language sql stable security definer set search_path = public as $$
  select b.user_id, b.total_earned, p.name, p.avatar_url, coalesce(p.is_verified, false)
  from public.tunez_balances b join public.profiles p on p.id = b.user_id
  where coalesce(b.total_earned, 0) > 0
  order by b.total_earned desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;
grant execute on function public.tunez_leaderboard(int) to anon, authenticated, service_role;


-- ── 3. Premium audio: private bucket, entitlement-checked access ───────────
-- Free tracks stay in the public 'music-audio' bucket. Premium tracks live in
-- the private 'music-premium' bucket; the app gets a short-lived signed link,
-- which Supabase only issues if the policy below allows it: the artist, an
-- admin, or a listener who unlocked the track (or its album).
-- Existing premium files are moved by the 'secure-premium-audio' edge function.
insert into storage.buckets (id, name, public)
values ('music-premium', 'music-premium', false)
on conflict (id) do update set public = false;

create or replace function public.can_access_premium_audio(p_object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.music_tracks t
    where t.audio_url like '%/music-premium/' || p_object_name
      and (
        t.artist_id = auth.uid()
        or public.is_admin(auth.uid())
        or exists (select 1 from public.tunez_unlocks u
                   where u.user_id = auth.uid() and (u.content_id = t.id or u.content_id = t.album_id))
      )
  )
$$;
grant execute on function public.can_access_premium_audio(text) to authenticated, service_role;

drop policy if exists "music-premium: entitled read" on storage.objects;
create policy "music-premium: entitled read" on storage.objects for select to authenticated
  using (bucket_id = 'music-premium' and public.can_access_premium_audio(name));

drop policy if exists "music-premium: artist upload" on storage.objects;
create policy "music-premium: artist upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'music-premium' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "music-premium: artist or admin delete" on storage.objects;
create policy "music-premium: artist or admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'music-premium' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(auth.uid())));


-- ── 4. Admin review views: admins only (re-applied) ────────────────────────
-- Dropped and recreated (CREATE OR REPLACE can't change a view's columns, and
-- a failed replace would silently leave the old, leaky view in place).
drop view if exists public.v_admin_post_queue;
drop view if exists public.v_admin_music_queue;
create view public.v_admin_post_queue with (security_barrier = true) as
 SELECT bp.id, bp.author_id, bp.title, bp.slug, bp.category, bp.excerpt, bp.content, bp.cover_url, bp.tags,
    bp.status, bp.review_note, bp.reviewed_by, bp.reviewed_at, bp.view_count, bp.is_featured, bp.published_at,
    bp.created_at, bp.updated_at,
    p.name AS author_name, p.email AS author_email, rev.name AS reviewed_by_name
   FROM blog_posts bp
     JOIN profiles p ON p.id = bp.author_id
     LEFT JOIN profiles rev ON rev.id = bp.reviewed_by
  WHERE public.is_admin(auth.uid())
  ORDER BY (CASE bp.status WHEN 'pending'::content_status THEN 0 WHEN 'approved'::content_status THEN 1 ELSE 2 END),
           bp.created_at DESC;

create view public.v_admin_music_queue with (security_barrier = true) as
 SELECT mt.id, mt.artist_id, mt.title, mt.genre, mt.duration, mt.description, mt.tags, mt.audio_url, mt.cover_url,
    mt.status, mt.review_note, mt.reviewed_by, mt.reviewed_at, mt.play_count, mt.is_featured, mt.created_at, mt.updated_at,
    p.name AS artist_name, p.email AS artist_email, p.is_verified AS artist_verified, rev.name AS reviewed_by_name
   FROM music_tracks mt
     JOIN profiles p ON p.id = mt.artist_id
     LEFT JOIN profiles rev ON rev.id = mt.reviewed_by
  WHERE public.is_admin(auth.uid())
  ORDER BY (CASE mt.status WHEN 'pending'::content_status THEN 0 WHEN 'approved'::content_status THEN 1 ELSE 2 END),
           mt.created_at DESC;

revoke all on public.v_admin_post_queue, public.v_admin_music_queue from anon, public;
grant select on public.v_admin_post_queue, public.v_admin_music_queue to authenticated, service_role;


-- ── 6. Plays/views count only for signed-in listeners ──────────────────────
-- Logged-out calls do nothing; signed-in listeners count once per window.
create or replace function public.should_count_view(p_content_id uuid, p_window interval)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_ok boolean;
begin
  if p_content_id is null or auth.uid() is null then return false; end if;
  insert into public.content_view_log as l (content_id, viewer_key, counted_at)
  values (p_content_id, auth.uid()::text, now())
  on conflict (content_id, viewer_key) do update set counted_at = now()
    where l.counted_at < now() - p_window
  returning true into v_ok;
  return coalesce(v_ok, false);
end $$;
revoke execute on function public.should_count_view(uuid, interval) from public, anon, authenticated;

do $$
declare fn text;
begin
  foreach fn in array array['increment_play_count(uuid)', 'increment_video_views(uuid)', 'increment_view_count(uuid)'] loop
    if to_regprocedure('public.' || fn) is not null then
      execute 'revoke execute on function public.' || fn || ' from public, anon';
      execute 'grant execute on function public.' || fn || ' to authenticated, service_role';
    end if;
  end loop;
end $$;


-- ── Verify (run separately; every row should say true) ─────────────────────
-- select 'notifications RLS' as check, relrowsecurity from pg_class where oid = 'public.notifications'::regclass
-- union all select 'tunez_balances RLS', relrowsecurity from pg_class where oid = 'public.tunez_balances'::regclass
-- union all select 'anon cannot read notifications', not has_table_privilege('anon', 'public.notifications', 'select')
-- union all select 'anon cannot read wallets', not has_table_privilege('anon', 'public.tunez_balances', 'select')
-- union all select 'anon cannot read admin views', not has_table_privilege('anon', 'public.v_admin_music_queue', 'select')
-- union all select 'premium bucket private', not public from storage.buckets where id = 'music-premium';

-- ── 5. Account enumeration — Supabase dashboard settings (not SQL) ─────────
-- Authentication → Sign In / Providers → Email: turn ON "Confirm email".
--   With it on, signing up with an existing email returns the same success
--   response as a new one instead of "user_already_exists".
-- Authentication → Attack Protection: enable CAPTCHA (Turnstile or hCaptcha)
--   and keep the rate limits on. Login timing differences come from Supabase
--   Auth itself; CAPTCHA + rate limits stop them being used at scale.
