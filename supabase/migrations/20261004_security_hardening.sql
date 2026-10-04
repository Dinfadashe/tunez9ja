-- ═══════════════════════════════════════════════════════════════════════════
-- Tunez9ja — security hardening (2026-10-04)
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- What it fixes:
--   1. Signup could create an ADMIN account (handle_new_user trusted the
--      role sent from the browser).
--   2. Users could edit privileged profile fields (role, verification,
--      earn multiplier, KYC approval/fee) on their own row.
--   3. The token economy ran in the browser: any logged-in user could call
--      add_tunez with any amount, spend_tunez with a NEGATIVE amount (mints)
--      or on someone else's account (drains), and reset daily caps.
--      → Replaced by server functions that take identity from the login
--        token and amounts from server rules:
--          earn_tunez, claim_daily_login, unlock_premium, claim_referral_bonus
--      → The raw functions are no longer callable by app users.
--   4. Direct browser writes to balances, transactions, purchases, unlocks.
--   5. A Paystack reference could be credited twice by concurrent calls.
--   6. Editor CVs were in a public bucket.
--
-- Guards only apply to requests made directly by app users (Postgres roles
-- anon/authenticated). SECURITY DEFINER functions, the service role used by
-- edge functions, and the SQL editor are unaffected.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Columns the editor application form saves ───────────────────────────
alter table public.profiles add column if not exists editor_motivation text;
alter table public.profiles add column if not exists editor_experience text;

-- ── Helpers ────────────────────────────────────────────────────────────────
create or replace function public.is_admin(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and (role::text = 'admin' or 'admin' = any(coalesce(available_roles::text[], '{}'::text[])))
  )
$$;

create or replace function public.is_direct_user_request()
returns boolean
language sql stable
as $$ select current_user in ('anon', 'authenticated') $$;


-- ── 1. Signup can only create user / artist / blogger accounts ─────────────
-- Same format the app used: first 4 letters of the name (non-letters → X)
-- + first 4 characters of the user id, uppercased.
create or replace function public.make_referral_code(p_name text, p_id uuid)
returns text language sql immutable
as $$ select regexp_replace(upper(left(coalesce(p_name, ''), 4)), '[^A-Z]', 'X', 'g') || upper(left(p_id::text, 4)) $$;

update public.profiles
   set referral_code = public.make_referral_code(name, id)
 where referral_code is null or referral_code = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role_txt text := lower(coalesce(new.raw_user_meta_data->>'role', 'user'));
  v_role     public.user_role;
  v_avail    public.user_role[];
begin
  if v_role_txt not in ('user', 'artist', 'blogger') then
    v_role_txt := 'user';   -- never trust a role sent by the browser
  end if;
  v_role := v_role_txt::public.user_role;

  if v_role = 'user' then
    v_avail := array['user'::public.user_role];
  else
    v_avail := array['user'::public.user_role, v_role];
  end if;

  insert into public.profiles (id, name, email, role, active_role, available_roles, bio, genre, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email, v_role, v_role, v_avail,
    new.raw_user_meta_data->>'bio',
    new.raw_user_meta_data->>'genre',
    public.make_referral_code(coalesce(new.raw_user_meta_data->>'name', new.email), new.id)
  )
  on conflict (id) do update set
    active_role     = coalesce(profiles.active_role, excluded.active_role),
    available_roles = coalesce(profiles.available_roles, excluded.available_roles),
    name            = coalesce(profiles.name, excluded.name),
    bio             = coalesce(profiles.bio, excluded.bio),
    genre           = coalesce(profiles.genre, excluded.genre),
    referral_code   = coalesce(profiles.referral_code, excluded.referral_code);
  return new;
end;
$$;


-- ── 2. Protect privileged profile columns ──────────────────────────────────
-- SECURITY INVOKER on purpose, so current_user reflects the caller.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  allowed text[];
begin
  if not public.is_direct_user_request() or public.is_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.id is distinct from auth.uid() then
      raise exception 'You can only create your own profile';
    end if;
    if new.role is null or new.role::text not in ('user', 'artist', 'blogger') then
      new.role := 'user';
    end if;
    new.available_roles := array(
      select distinct r
      from unnest(coalesce(new.available_roles::text[], '{}'::text[]) || array['user', new.role::text]) as r
      where r in ('user', 'artist', 'blogger')
    );
    if new.active_role is null or not (new.active_role::text = any(new.available_roles::text[])) then
      new.active_role := new.role;
    end if;
    new.is_verified     := false;
    new.verified_type   := null;
    new.earn_multiplier := 1.0;
    new.editor_status   := null;
    new.kyc_fee_paid    := false;
    new.kyc_fee_ref     := null;
    return new;
  end if;

  -- UPDATE of own row: privileged fields keep their old values
  new.role               := old.role;
  new.available_roles    := old.available_roles;
  new.is_verified        := old.is_verified;
  new.verified_type      := old.verified_type;
  new.earn_multiplier    := old.earn_multiplier;
  new.content_violations := old.content_violations;
  new.kyc_fee_paid       := old.kyc_fee_paid;
  new.kyc_fee_ref        := old.kyc_fee_ref;
  if old.referral_code is not null and old.referral_code <> '' then
    new.referral_code := old.referral_code;   -- can't take over someone else's code
  end if;

  if new.kyc_status is distinct from old.kyc_status
     and coalesce(new.kyc_status, '') <> 'pending' then
    new.kyc_status := old.kyc_status;
  end if;

  if new.editor_status is distinct from old.editor_status
     and not (new.editor_status = 'applied'
              and coalesce(old.editor_status, '') in ('', 'rejected', 'none')) then
    new.editor_status := old.editor_status;
  end if;

  allowed := coalesce(old.available_roles::text[], '{}'::text[]) || array['user', old.role::text];
  if old.editor_status = 'approved' then allowed := allowed || array['editor']; end if;
  if new.active_role is not null and not (new.active_role::text = any(allowed)) then
    new.active_role := old.active_role;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileges on public.profiles;
create trigger trg_protect_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();


-- ── 3. Server-side token economy ───────────────────────────────────────────

-- Looks up any piece of content and returns its owner, price and status.
create or replace function public.tunez_content_info(p_id uuid)
returns table (kind text, owner_id uuid, title text, status text, is_premium boolean, price numeric)
language plpgsql stable security definer set search_path = public
as $$
declare
  j jsonb;
begin
  select to_jsonb(t) into j from public.music_tracks t where t.id = p_id;
  if j is not null then
    return query select 'track', (j->>'artist_id')::uuid, j->>'title', j->>'status',
      coalesce((j->>'is_premium')::boolean, false), (j->>'tunez_price')::numeric; return;
  end if;
  select to_jsonb(t) into j from public.blog_posts t where t.id = p_id;
  if j is not null then
    return query select 'post', (j->>'author_id')::uuid, j->>'title', j->>'status',
      coalesce((j->>'is_premium')::boolean, false), (j->>'tunez_price')::numeric; return;
  end if;
  select to_jsonb(t) into j from public.videos t where t.id = p_id;
  if j is not null then
    return query select 'video', coalesce(j->>'uploader_id', j->>'user_id')::uuid, j->>'title', j->>'status',
      coalesce((j->>'is_premium')::boolean, false), (j->>'tunez_price')::numeric; return;
  end if;
  select to_jsonb(t) into j from public.albums t where t.id = p_id;
  if j is not null then
    return query select 'album', (j->>'artist_id')::uuid, j->>'title', j->>'status',
      coalesce((j->>'is_premium')::boolean, false), (j->>'tunez_price')::numeric; return;
  end if;
  select to_jsonb(t) into j from public.comments t where t.id = p_id;
  if j is not null then
    return query select 'comment', coalesce(j->>'user_id', j->>'author_id')::uuid, left(j->>'content', 60), 'approved',
      false, null::numeric; return;
  end if;
end;
$$;

-- Platform admin who receives the admin share (same as before: role = admin)
create or replace function public.tunez_admin_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.profiles where role::text = 'admin' order by id limit 1 $$;

-- Earn for streaming / reading / watching / reacting / commenting.
-- Amounts, split and cooldowns are decided here, not by the browser.
create or replace function public.earn_tunez(p_action text, p_content_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_rate   numeric;
  v_hours  numeric;
  v_info   record;
  v_admin  uuid;
  v_user_amt  numeric; v_owner_amt numeric := 0; v_admin_amt numeric;
  v_got_user  numeric := 0; v_got_owner numeric := 0; v_got_admin numeric := 0;
  v_label  text;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_logged_in'); end if;

  -- Same rates and cooldowns the app used before
  case p_action
    when 'stream'  then v_rate := 10; v_hours := 6;      v_label := 'Streamed: ';
    when 'read'    then v_rate := 6;  v_hours := 24;     v_label := 'Read: ';
    when 'watch'   then v_rate := 8;  v_hours := 6;      v_label := 'Watched: ';
    when 'react'   then v_rate := 2;  v_hours := 999999; v_label := 'Reacted to: ';
    when 'comment' then v_rate := 4;  v_hours := 999999; v_label := 'Commented on: ';
    else return jsonb_build_object('success', false, 'reason', 'invalid_action');
  end case;

  select * into v_info from public.tunez_content_info(p_content_id);
  if v_info.kind is null then return jsonb_build_object('success', false, 'reason', 'content_not_found'); end if;
  if coalesce(v_info.status, 'approved') <> 'approved' then
    return jsonb_build_object('success', false, 'reason', 'content_not_approved');
  end if;
  -- No earning from your own content
  if v_info.owner_id = v_uid then return jsonb_build_object('success', false, 'reason', 'own_content'); end if;

  -- Atomic cooldown: one claim per user+content+action per window
  perform pg_advisory_xact_lock(hashtext(v_uid::text || p_content_id::text || p_action));
  if exists (select 1 from public.tunez_cooldowns
             where user_id = v_uid and content_id = p_content_id and action = p_action
               and expires_at > now()) then
    return jsonb_build_object('success', false, 'reason', 'cooldown');
  end if;
  update public.tunez_cooldowns
     set expires_at = now() + make_interval(hours => v_hours::int)
   where user_id = v_uid and content_id = p_content_id and action = p_action;
  if not found then
    insert into public.tunez_cooldowns (user_id, content_id, action, expires_at)
    values (v_uid, p_content_id, p_action, now() + make_interval(hours => v_hours::int));
  end if;

  -- Split: 50% user, 30% content owner, rest to admin (as before)
  v_user_amt := round(v_rate * 0.5, 4);
  if v_info.owner_id is not null then v_owner_amt := round(v_rate * 0.3, 4); end if;
  v_admin_amt := v_rate - v_user_amt - v_owner_amt;

  v_got_user := coalesce(public.add_tunez(v_uid, v_user_amt, 'earn_' || p_action,
                  v_label || coalesce(v_info.title, 'content'), p_content_id), 0);
  if v_owner_amt > 0 then
    v_got_owner := coalesce(public.add_tunez(v_info.owner_id, v_owner_amt, 'earn_content_owner',
                    'Content earnings: ' || v_label || coalesce(v_info.title, 'content'), p_content_id), 0);
  end if;
  v_admin := public.tunez_admin_id();
  if v_admin is not null and v_admin_amt > 0 then
    v_got_admin := coalesce(public.add_tunez(v_admin, v_admin_amt, 'earn_admin',
                    'Admin share: ' || v_label || coalesce(v_info.title, 'content'), p_content_id), 0);
  end if;

  return jsonb_build_object('success', v_got_user > 0, 'reason', case when v_got_user > 0 then null else 'daily_cap' end,
    'userAmt', v_got_user, 'ownerAmt', v_got_owner, 'adminAmt', v_got_admin);
end;
$$;

-- Daily login bonus: once per calendar day
create or replace function public.claim_daily_login()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_got numeric;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_logged_in'); end if;
  perform pg_advisory_xact_lock(hashtext(v_uid::text || 'daily_login'));
  if exists (select 1 from public.tunez_transactions
             where user_id = v_uid and type = 'earn_daily' and created_at >= current_date) then
    return jsonb_build_object('success', false, 'reason', 'already_claimed');
  end if;
  v_got := coalesce(public.add_tunez(v_uid, 5, 'earn_daily', 'Daily login bonus', null), 0);
  return jsonb_build_object('success', v_got > 0, 'userAmt', v_got);
end;
$$;

-- Premium unlock: debit, record and pay owner/admin in one transaction
create or replace function public.unlock_premium(p_content_id uuid, p_content_type text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_info  record;
  v_bal   numeric;
  v_admin uuid;
  v_owner_amt numeric; v_admin_amt numeric;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_logged_in'); end if;

  select * into v_info from public.tunez_content_info(p_content_id);
  if v_info.kind is null then return jsonb_build_object('success', false, 'reason', 'content_not_found'); end if;
  if not v_info.is_premium or coalesce(v_info.price, 0) <= 0 then
    return jsonb_build_object('success', true, 'free', true);
  end if;
  if v_info.owner_id = v_uid then return jsonb_build_object('success', true, 'own_content', true); end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text || p_content_id::text || 'unlock'));
  if exists (select 1 from public.tunez_unlocks where user_id = v_uid and content_id = p_content_id) then
    return jsonb_build_object('success', true, 'alreadyUnlocked', true);
  end if;

  select balance into v_bal from public.tunez_balances where user_id = v_uid for update;
  if coalesce(v_bal, 0) < v_info.price then
    return jsonb_build_object('success', false, 'reason', 'insufficient_balance',
                              'needed', v_info.price, 'have', coalesce(v_bal, 0));
  end if;

  perform public.spend_tunez(v_uid, v_info.price, 'spend_premium',
                             'Unlocked premium: ' || coalesce(v_info.title, 'content'), p_content_id);

  insert into public.tunez_unlocks (user_id, content_id, content_type, tunez_paid)
  values (v_uid, p_content_id, coalesce(p_content_type, v_info.kind), v_info.price);

  -- 70% to the content owner, 30% to admin (as before)
  v_owner_amt := round(v_info.price * 0.70, 4);
  v_admin_amt := round(v_info.price * 0.30, 4);
  if v_info.owner_id is not null then
    perform public.add_tunez(v_info.owner_id, v_owner_amt, 'earn_content_owner',
                             'Premium unlock: ' || coalesce(v_info.title, 'content'), p_content_id);
  end if;
  v_admin := public.tunez_admin_id();
  if v_admin is not null then
    perform public.add_tunez(v_admin, v_admin_amt, 'earn_admin',
                             'Premium admin share: ' || coalesce(v_info.title, 'content'), p_content_id);
  end if;

  return jsonb_build_object('success', true, 'ownerAmt', v_owner_amt, 'adminAmt', v_admin_amt);
end;
$$;

-- Referral bonus: 15 each, once per new account, within 7 days of signup
create or replace function public.claim_referral_bonus(p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_code     text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9-]', '', 'g'));
  v_referrer uuid;
  v_created  timestamptz;
  v_name     text;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_logged_in'); end if;
  if v_code = '' then return jsonb_build_object('success', false, 'reason', 'no_code'); end if;

  select created_at into v_created from auth.users where id = v_uid;
  if v_created is null or v_created < now() - interval '7 days' then
    return jsonb_build_object('success', false, 'reason', 'account_too_old');
  end if;

  if v_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into v_referrer from public.profiles where id = v_code::uuid;
  else
    select id into v_referrer from public.profiles where upper(referral_code) = v_code limit 1;
  end if;
  if v_referrer is null then return jsonb_build_object('success', false, 'reason', 'invalid_code'); end if;
  if v_referrer = v_uid then return jsonb_build_object('success', false, 'reason', 'self_referral'); end if;

  -- Once per account (atomic marker in the cooldown table)
  perform pg_advisory_xact_lock(hashtext(v_uid::text || 'referral'));
  if exists (select 1 from public.tunez_cooldowns where user_id = v_uid and content_id = v_uid and action = 'referral_claimed')
     or exists (select 1 from public.referrals where referred_id = v_uid) then
    return jsonb_build_object('success', false, 'reason', 'already_claimed');
  end if;
  insert into public.tunez_cooldowns (user_id, content_id, action, expires_at)
  values (v_uid, v_uid, 'referral_claimed', 'infinity');

  select name into v_name from public.profiles where id = v_uid;
  perform public.add_tunez(v_referrer, 15, 'earn_referral',
                           'Referral bonus — ' || coalesce(v_name, 'a new member') || ' joined using your link', null);
  perform public.add_tunez(v_uid, 15, 'earn_referral', 'Welcome bonus — you joined via referral link', null);

  begin
    insert into public.referrals (referrer_id, referred_id, referrer_credited, referred_credited, referrer_amount)
    values (v_referrer, v_uid, true, true, 15);
  exception when others then
    null;  -- referrals table shape differs; the bonus itself is already recorded
  end;

  return jsonb_build_object('success', true, 'userAmt', 15);
end;
$$;


-- ── 4. Token ledger: no direct writes from the browser ─────────────────────
create or replace function public.block_direct_ledger_writes()
returns trigger
language plpgsql
as $$
begin
  if public.is_direct_user_request() and not public.is_admin(auth.uid()) then
    raise exception 'Direct changes to % are not allowed', tg_table_name;
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['tunez_balances', 'tunez_transactions', 'tunez_purchases',
                           'tunez_unlocks', 'tunez_cooldowns', 'tunez_daily_caps'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_block_direct_writes on public.%I', t);
      execute format('create trigger trg_block_direct_writes before insert or update or delete on public.%I
                      for each row execute function public.block_direct_ledger_writes()', t);
    end if;
  end loop;
end $$;

-- Remove the interim unlock trigger from an earlier draft, if present
drop trigger if exists trg_require_paid_unlock on public.tunez_unlocks;
drop function if exists public.require_paid_unlock();


-- ── 5. Who may call what ───────────────────────────────────────────────────
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        -- raw ledger functions: server only
        'add_tunez', 'spend_tunez', 'increment_daily_tunez', 'credit_purchased_tunez',
        'tunez_content_info', 'tunez_admin_id',
        -- user-facing token functions
        'earn_tunez', 'claim_daily_login', 'unlock_premium', 'claim_referral_bonus',
        -- admin/editor workflows (should check roles internally)
        'approve_editor', 'reject_editor', 'approve_verification', 'reject_verification',
        'editor_approve_post', 'editor_reject_post'
      )
  loop
    execute format('revoke execute on function %s from public, anon', fn.sig);
    if fn.proname in ('add_tunez', 'spend_tunez', 'increment_daily_tunez', 'credit_purchased_tunez',
                      'tunez_content_info', 'tunez_admin_id') then
      execute format('revoke execute on function %s from authenticated', fn.sig);
    else
      execute format('grant execute on function %s to authenticated', fn.sig);
    end if;
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;


-- ── 6. One credit per Paystack reference ───────────────────────────────────
do $$
begin
  create unique index if not exists tunez_purchases_paystack_ref_key
    on public.tunez_purchases (paystack_ref);
exception when unique_violation then
  raise warning 'SKIPPED unique index: duplicate paystack_ref rows exist (possible double credits). Find them with: select paystack_ref, count(*) from tunez_purchases group by 1 having count(*) > 1;';
end $$;


-- ── 7. Editor CVs: private bucket ──────────────────────────────────────────
update storage.buckets set public = false where id = 'editor-cvs';

drop policy if exists "editor_cvs_owner_upload" on storage.objects;
create policy "editor_cvs_owner_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'editor-cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "editor_cvs_owner_update" on storage.objects;
create policy "editor_cvs_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'editor-cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "editor_cvs_admin_read" on storage.objects;
create policy "editor_cvs_admin_read" on storage.objects for select to authenticated
  using (bucket_id = 'editor-cvs' and (public.is_admin(auth.uid()) or (storage.foldername(name))[1] = auth.uid()::text));


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Permission checks for admin / editor / engagement functions
--
-- These functions are SECURITY DEFINER but did not check who was calling:
--   • approve_/reject_verification, approve_/reject_editor — anyone could
--     verify themselves (blue tick + 1.5x earnings) or become an editor
--   • editor_approve_post — `NULL != 'approved'` is not true, so ANY user
--     could approve posts (their own included) and mint editor rewards
--     repeatedly; editor_reject_post — anyone could reject any post
--   • toggle_reaction — acted for whatever user id was passed in
--   • increment_* — unlimited calls inflated plays/views (which count
--     toward verification)
--   • check_verification_eligibility — exposed anyone's KYC status
--
-- Approach: the original function is renamed to _impl_<name> (callable only
-- by the server) and a wrapper with the same name and parameters does the
-- checks, then calls it. Your original logic is untouched.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  f record;
begin
  for f in select * from (values
    ('approve_editor',                 'uuid'),
    ('reject_editor',                  'uuid, text'),
    ('approve_verification',           'uuid'),
    ('reject_verification',            'uuid, text'),
    ('editor_approve_post',            'uuid, uuid'),
    ('editor_reject_post',             'uuid, uuid, text'),
    ('check_verification_eligibility', 'uuid'),
    ('toggle_reaction',                'uuid, text, uuid, uuid, uuid, uuid'),
    ('increment_play_count',           'uuid'),
    ('increment_video_views',          'uuid'),
    ('increment_view_count',           'uuid')
  ) as t(name, args)
  loop
    if to_regprocedure(format('public._impl_%s(%s)', f.name, f.args)) is null
       and to_regprocedure(format('public.%s(%s)', f.name, f.args)) is not null then
      execute format('alter function public.%s(%s) rename to _impl_%s', f.name, f.args, f.name);
    end if;
    if to_regprocedure(format('public._impl_%s(%s)', f.name, f.args)) is not null then
      execute format('revoke execute on function public._impl_%s(%s) from public, anon, authenticated', f.name, f.args);
    end if;
  end loop;
end $$;

-- Admins only (the SQL editor / service role, where auth.uid() is null, are allowed)
create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can do this' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.approve_editor(p_user_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  -- Don't append 'editor' to available_roles twice
  if exists (select 1 from public.profiles where id = p_user_id and editor_status = 'approved') then return; end if;
  perform public._impl_approve_editor(p_user_id);
end;
$$;

create or replace function public.reject_editor(p_user_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  perform public._impl_reject_editor(p_user_id, left(coalesce(p_reason, ''), 1000));
end;
$$;

create or replace function public.approve_verification(p_user_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  perform public._impl_approve_verification(p_user_id);
end;
$$;

create or replace function public.reject_verification(p_user_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  perform public._impl_reject_verification(p_user_id, left(coalesce(p_reason, ''), 1000));
end;
$$;

-- Editors act only as themselves, only on pending posts, never their own;
-- the post row is locked so it can't be approved twice concurrently.
create or replace function public.editor_review_check(p_editor_id uuid, p_post_id uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
  v_author uuid;
begin
  if v_uid is not null and v_uid <> p_editor_id and not public.is_admin(v_uid) then
    return 'not_yourself';
  end if;
  if not exists (select 1 from public.profiles
                 where id = p_editor_id
                   and (editor_status = 'approved' or role::text = 'admin')) then
    return 'not_an_editor';
  end if;
  select status::text, author_id into v_status, v_author
    from public.blog_posts where id = p_post_id for update;
  if not found then return 'post_not_found'; end if;
  if v_author = p_editor_id then return 'own_post'; end if;
  if v_status <> 'pending' then return 'not_pending'; end if;
  return null;
end;
$$;

create or replace function public.editor_approve_post(p_editor_id uuid, p_post_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_problem text := public.editor_review_check(p_editor_id, p_post_id);
begin
  if v_problem is not null then
    return jsonb_build_object('success', false, 'reason', v_problem);
  end if;
  return public._impl_editor_approve_post(p_editor_id, p_post_id);
end;
$$;

create or replace function public.editor_reject_post(p_editor_id uuid, p_post_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_problem text := public.editor_review_check(p_editor_id, p_post_id);
begin
  if v_problem is not null then
    raise exception 'Cannot reject this post: %', v_problem using errcode = '42501';
  end if;
  perform public._impl_editor_reject_post(p_editor_id, p_post_id, left(coalesce(p_reason, ''), 1000));
end;
$$;

create or replace function public.check_verification_eligibility(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then
    return jsonb_build_object('eligible', false, 'reason', 'Not allowed');
  end if;
  return public._impl_check_verification_eligibility(p_user_id);
end;
$$;

create or replace function public.toggle_reaction(
  p_user_id uuid, p_type text,
  p_post_id uuid default null, p_track_id uuid default null,
  p_video_id uuid default null, p_comment_id uuid default null)
returns text language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'You can only react as yourself' using errcode = '42501';
  end if;
  if p_type is null or length(p_type) > 20 then
    raise exception 'Invalid reaction';
  end if;
  return public._impl_toggle_reaction(p_user_id, p_type, p_post_id, p_track_id, p_video_id, p_comment_id);
end;
$$;

-- ── Plays / views: count each listener once per window ─────────────────────
-- Logged-in viewers: once per content per window. Logged-out visitors: at
-- most once per content every 30 seconds overall (they can't be told apart).
create table if not exists public.content_view_log (
  content_id uuid not null,
  viewer_key text not null,
  counted_at timestamptz not null default now(),
  primary key (content_id, viewer_key)
);
alter table public.content_view_log enable row level security;   -- no policies: server only
revoke all on public.content_view_log from anon, authenticated;

create or replace function public.should_count_view(p_content_id uuid, p_window interval)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_key    text := coalesce(auth.uid()::text, 'anon');
  v_window interval := case when auth.uid() is null then interval '30 seconds' else p_window end;
  v_ok     boolean;
begin
  if p_content_id is null then return false; end if;
  insert into public.content_view_log as l (content_id, viewer_key, counted_at)
  values (p_content_id, v_key, now())
  on conflict (content_id, viewer_key) do update set counted_at = now()
    where l.counted_at < now() - v_window
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

create or replace function public.increment_play_count(p_track_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.should_count_view(p_track_id, interval '6 hours') then
    perform public._impl_increment_play_count(p_track_id);
  end if;
end;
$$;

create or replace function public.increment_video_views(p_video_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.should_count_view(p_video_id, interval '6 hours') then
    perform public._impl_increment_video_views(p_video_id);
  end if;
end;
$$;

create or replace function public.increment_view_count(p_post_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.should_count_view(p_post_id, interval '24 hours') then
    perform public._impl_increment_view_count(p_post_id);
  end if;
end;
$$;

-- Who may call the wrappers
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('approve_editor', 'reject_editor', 'approve_verification', 'reject_verification',
                        'editor_approve_post', 'editor_reject_post', 'check_verification_eligibility',
                        'toggle_reaction', 'increment_play_count', 'increment_video_views',
                        'increment_view_count', 'assert_admin', 'editor_review_check', 'should_count_view')
  loop
    execute format('revoke execute on function %s from public', fn.sig);
    if fn.proname in ('assert_admin', 'editor_review_check', 'should_count_view') then
      execute format('revoke execute on function %s from anon, authenticated', fn.sig);
    elsif fn.proname in ('increment_play_count', 'increment_video_views', 'increment_view_count') then
      execute format('grant execute on function %s to anon, authenticated', fn.sig);   -- logged-out plays still count
    else
      execute format('revoke execute on function %s from anon', fn.sig);
      execute format('grant execute on function %s to authenticated', fn.sig);
    end if;
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Content status can only be changed by admins and the review functions
--
-- Creators may save drafts and submit for review ('draft' / 'pending') but
-- cannot approve their own content, edit counters or review fields, or
-- transfer ownership — whatever the table's RLS policies allow.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.guard_content_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  j_new jsonb;
  j_old jsonb;
  k     text;
begin
  if not public.is_direct_user_request() or public.is_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is null or new.status::text not in ('draft', 'pending') then
      new.status := 'pending';
    end if;
    -- New content starts with zeroed counters and no review data
    j_new := to_jsonb(new);
    foreach k in array array['play_count', 'view_count', 'views'] loop
      if j_new ? k then j_new := jsonb_set(j_new, array[k], '0'::jsonb); end if;
    end loop;
    foreach k in array array['reviewed_by', 'reviewed_at', 'published_at'] loop
      if j_new ? k then j_new := jsonb_set(j_new, array[k], 'null'::jsonb); end if;
    end loop;
    new := jsonb_populate_record(new, j_new);
    return new;
  end if;

  -- UPDATE
  if new.status is distinct from old.status and new.status::text not in ('draft', 'pending') then
    new.status := old.status;
  end if;

  -- Counters, review fields and ownership keep their old values
  j_new := to_jsonb(new);
  j_old := to_jsonb(old);
  foreach k in array array['play_count', 'view_count', 'views', 'reviewed_by', 'reviewed_at',
                           'published_at', 'author_id', 'artist_id', 'uploader_id'] loop
    if j_new ? k then
      j_new := jsonb_set(j_new, array[k], coalesce(j_old -> k, 'null'::jsonb));
    end if;
  end loop;
  new := jsonb_populate_record(new, j_new);
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['blog_posts', 'music_tracks', 'videos', 'albums'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_guard_content_status on public.%I', t);
      execute format('create trigger trg_guard_content_status before insert or update on public.%I
                      for each row execute function public.guard_content_status()', t);
    end if;
  end loop;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Read access & remaining policies (from the pg_policies review)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 10a. Private profile columns ───────────────────────────────────────────
-- `profiles_read_all` lets anyone (even logged-out visitors) read every row.
-- Rows stay public (names, avatars, bios are shown across the app) but the
-- private COLUMNS are no longer readable directly. The app reads them via:
--   my_profile()      — your own full row
--   admin_profiles()  — full rows, admins only
--   public_profile()  — anyone's profile minus private fields
-- NOTE: a column added to profiles later is private by default; to make it
-- public, re-run this block (or `grant select (col) on profiles to anon, authenticated`).
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name !~ '^(email|phone.*|kyc_.*|last_kyc_attempt|editor_cv_url|editor_motivation|editor_experience|editor_reject_reason|content_violations|date_of_birth|dob|address.*|bank_.*|account_.*)$';
  execute 'revoke select on public.profiles from anon, authenticated';
  execute format('grant select (%s) on public.profiles to anon, authenticated', cols);
end $$;

create or replace function public.my_profile()
returns setof public.profiles
language sql stable security definer set search_path = public
as $$ select * from public.profiles where id = auth.uid() $$;

create or replace function public.admin_profiles()
returns setof public.profiles
language sql stable security definer set search_path = public
as $$ select * from public.profiles where public.is_admin(auth.uid()) $$;

create or replace function public.public_profile(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select to_jsonb(p) - array['email', 'phone', 'phone_number', 'kyc_legal_name', 'kyc_id_path', 'kyc_social_links',
                             'kyc_fee_ref', 'kyc_fee_paid', 'kyc_status', 'kyc_submitted_at', 'kyc_reject_reason',
                             'last_kyc_attempt', 'editor_cv_url', 'editor_motivation', 'editor_experience',
                             'editor_reject_reason', 'content_violations', 'date_of_birth', 'dob', 'address']
  from public.profiles p where p.id = p_id
$$;

revoke execute on function public.my_profile() from public, anon;
grant  execute on function public.my_profile() to authenticated, service_role;
revoke execute on function public.admin_profiles() from public, anon;
grant  execute on function public.admin_profiles() to authenticated, service_role;
grant  execute on function public.public_profile(uuid) to anon, authenticated, service_role;


-- ── 10b. Tables that had no policies ───────────────────────────────────────
-- Enabling RLS with owner-scoped policies. SECURITY DEFINER functions (which
-- write the ledger, editor activity, etc.) are unaffected.
do $$
declare
  t text;
begin
  foreach t in array array['tunez_transactions', 'tunez_unlocks', 'tunez_purchases',
                           'tunez_cooldowns', 'tunez_daily_caps'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists "%s: own read" on public.%I', t, t);
      execute format('create policy "%s: own read" on public.%I for select to authenticated using (user_id = auth.uid())', t, t);
      execute format('drop policy if exists "%s: admin read" on public.%I', t, t);
      execute format('create policy "%s: admin read" on public.%I for select to authenticated using (public.is_admin(auth.uid()))', t, t);
    end if;
  end loop;
end $$;

-- Balances: drop the "own ALL" write policy (reads stay; writes are server-only)
drop policy if exists "tunze_balances: own all" on public.tunez_balances;

-- Owner-scoped policies for the remaining tables. Each table is skipped if it
-- doesn't exist, so the script never stops halfway.
create or replace function pg_temp.apply_policies(p_table text, p_stmts text[])
returns void language plpgsql as $f$
declare st text;
begin
  if to_regclass('public.' || p_table) is null then
    raise notice 'Skipping % (table not found)', p_table; return;
  end if;
  execute format('alter table public.%I enable row level security', p_table);
  foreach st in array p_stmts loop execute st; end loop;
end $f$;

select pg_temp.apply_policies('albums', array[
  'drop policy if exists "albums: public reads approved" on public.albums',
  'create policy "albums: public reads approved" on public.albums for select using (status::text = ''approved'')',
  'drop policy if exists "albums: owner reads own" on public.albums',
  'create policy "albums: owner reads own" on public.albums for select to authenticated using (artist_id = auth.uid())',
  'drop policy if exists "albums: admin all" on public.albums',
  'create policy "albums: admin all" on public.albums for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))',
  'drop policy if exists "albums: owner inserts own" on public.albums',
  'create policy "albums: owner inserts own" on public.albums for insert to authenticated with check (artist_id = auth.uid())',
  'drop policy if exists "albums: owner updates own" on public.albums',
  'create policy "albums: owner updates own" on public.albums for update to authenticated using (artist_id = auth.uid()) with check (artist_id = auth.uid())',
  'drop policy if exists "albums: owner deletes own non-approved" on public.albums',
  'create policy "albums: owner deletes own non-approved" on public.albums for delete to authenticated using (artist_id = auth.uid() and status::text <> ''approved'')'
]);

-- Playlists, playlist tracks, saved tracks: private to their owner
select pg_temp.apply_policies('playlists', array[
  'drop policy if exists "playlists: owner all" on public.playlists',
  'create policy "playlists: owner all" on public.playlists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())'
]);
select pg_temp.apply_policies('playlist_tracks', array[
  'drop policy if exists "playlist_tracks: owner all" on public.playlist_tracks',
  'create policy "playlist_tracks: owner all" on public.playlist_tracks for all to authenticated
     using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()))
     with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()))'
]);
select pg_temp.apply_policies('saved_tracks', array[
  'drop policy if exists "saved_tracks: owner all" on public.saved_tracks',
  'create policy "saved_tracks: owner all" on public.saved_tracks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())'
]);

-- Editor activity: written only by the review functions
select pg_temp.apply_policies('editor_activity', array[
  'drop policy if exists "editor_activity: own read" on public.editor_activity',
  'create policy "editor_activity: own read" on public.editor_activity for select to authenticated using (editor_id = auth.uid() or public.is_admin(auth.uid()))'
]);

-- Referrals: rows are created by claim_referral_bonus only; users just read
do $$
begin
  if to_regclass('public.referrals') is not null then
    drop policy if exists "System can insert referrals" on public.referrals;
    drop policy if exists "System can update referrals" on public.referrals;
  end if;
end $$;


-- ── 10c. Editors can see and edit the review queue ─────────────────────────
-- No policy let editors read pending posts, so the Editor dashboard queue
-- was always empty and their text edits silently failed. Status changes stay
-- blocked by the content guard (section 9); approval goes through
-- editor_approve_post.
create or replace function public.is_approved_editor(uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = uid and editor_status = 'approved') $$;

drop policy if exists "posts: editor reads pending" on public.blog_posts;
create policy "posts: editor reads pending" on public.blog_posts for select to authenticated
  using (status::text = 'pending' and public.is_approved_editor(auth.uid()));
drop policy if exists "posts: editor updates pending" on public.blog_posts;
create policy "posts: editor updates pending" on public.blog_posts for update to authenticated
  using (status::text = 'pending' and public.is_approved_editor(auth.uid()))
  with check (status::text = 'pending' and public.is_approved_editor(auth.uid()));


-- ── 10d. Storage: only the uploader (or an admin) may delete files ─────────
-- "owner delete" on music-audio / music-covers let ANY logged-in user delete
-- ANY song or cover.
do $$
declare
  owner_expr text;
  b text;
begin
  -- Newer Supabase stores the uploader in owner_id (text), older in owner (uuid)
  if exists (select 1 from information_schema.columns
             where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id') then
    owner_expr := 'owner_id = auth.uid()::text';
  elsif exists (select 1 from information_schema.columns
                where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner') then
    owner_expr := 'owner = auth.uid()';
  else
    raise warning 'SKIPPED storage delete fix: storage.objects has no owner column';
    return;
  end if;
  foreach b in array array['music-audio', 'music-covers'] loop
    execute format('drop policy if exists %I on storage.objects', b || ': owner delete');
    execute format('create policy %I on storage.objects for delete to authenticated
                    using (bucket_id = %L and (%s or public.is_admin(auth.uid())))',
                   b || ': owner delete', b, owner_expr);
  end loop;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Blog drafts
-- The blog editor auto-saves with status 'draft', but content_status had no
-- such value and the author update policy excluded drafts — so every
-- auto-save failed. (Already applied to production on 2026-10-04.)
--
-- NOTE: on a fresh database, run the ALTER TYPE line on its own first — a new
-- enum value must be committed before other statements in the same run.
-- ═══════════════════════════════════════════════════════════════════════════
alter type public.content_status add value if not exists 'draft';

drop policy if exists "posts: blogger updates own pending" on public.blog_posts;
create policy "posts: blogger updates own pending" on public.blog_posts for update
  using (author_id = auth.uid() and status::text in ('draft', 'pending', 'rejected'))
  with check (author_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- 12. Admin review views: admins only
-- v_admin_post_queue / v_admin_music_queue run with their owner's rights, so
-- they bypassed RLS and the private-column protection: ANYONE (even logged
-- out) could read every draft/pending/rejected post, every unreleased track's
-- audio URL, and every author's / artist's email.
-- Same columns as before (the admin dashboard is unchanged), but rows are
-- returned only to admins. security_barrier stops crafted filters from
-- probing rows past the admin check.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace view public.v_admin_post_queue with (security_barrier = true) as
 SELECT bp.id,
    bp.author_id,
    bp.title,
    bp.slug,
    bp.category,
    bp.excerpt,
    bp.content,
    bp.cover_url,
    bp.tags,
    bp.status,
    bp.review_note,
    bp.reviewed_by,
    bp.reviewed_at,
    bp.view_count,
    bp.is_featured,
    bp.published_at,
    bp.created_at,
    bp.updated_at,
    p.name AS author_name,
    p.email AS author_email,
    rev.name AS reviewed_by_name
   FROM blog_posts bp
     JOIN profiles p ON p.id = bp.author_id
     LEFT JOIN profiles rev ON rev.id = bp.reviewed_by
  WHERE public.is_admin(auth.uid())
  ORDER BY (
        CASE bp.status
            WHEN 'pending'::content_status THEN 0
            WHEN 'approved'::content_status THEN 1
            ELSE 2
        END), bp.created_at DESC;

create or replace view public.v_admin_music_queue with (security_barrier = true) as
 SELECT mt.id,
    mt.artist_id,
    mt.title,
    mt.genre,
    mt.duration,
    mt.description,
    mt.tags,
    mt.audio_url,
    mt.cover_url,
    mt.status,
    mt.review_note,
    mt.reviewed_by,
    mt.reviewed_at,
    mt.play_count,
    mt.is_featured,
    mt.created_at,
    mt.updated_at,
    p.name AS artist_name,
    p.email AS artist_email,
    p.is_verified AS artist_verified,
    rev.name AS reviewed_by_name
   FROM music_tracks mt
     JOIN profiles p ON p.id = mt.artist_id
     LEFT JOIN profiles rev ON rev.id = mt.reviewed_by
  WHERE public.is_admin(auth.uid())
  ORDER BY (
        CASE mt.status
            WHEN 'pending'::content_status THEN 0
            WHEN 'approved'::content_status THEN 1
            ELSE 2
        END), mt.created_at DESC;

revoke all on public.v_admin_post_queue, public.v_admin_music_queue from anon, public;
grant select on public.v_admin_post_queue, public.v_admin_music_queue to authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- 13. Album track assignment
-- Artists may only edit their own PENDING/REJECTED tracks (so approved audio
-- can't be swapped), which also silently blocked adding approved tracks to
-- albums. This function changes ONLY album_id / track_number, and only when
-- the caller owns the track and (if given) the album.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.set_track_album(p_track_id uuid, p_album_id uuid, p_track_number int default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_logged_in'); end if;
  if not exists (select 1 from public.music_tracks where id = p_track_id
                 and (artist_id = v_uid or public.is_admin(v_uid))) then
    return jsonb_build_object('success', false, 'reason', 'not_your_track');
  end if;
  if p_album_id is not null and not exists (select 1 from public.albums where id = p_album_id
                 and (artist_id = v_uid or public.is_admin(v_uid))) then
    return jsonb_build_object('success', false, 'reason', 'not_your_album');
  end if;
  update public.music_tracks
     set album_id = p_album_id,
         track_number = case when p_album_id is null then null else p_track_number end
   where id = p_track_id;
  return jsonb_build_object('success', true);
end;
$$;

-- Delete an album and detach its tracks in one step. Same rule as the
-- albums delete policy: owners may delete non-approved albums, admins any.
create or replace function public.delete_album(p_album_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_owner  uuid;
  v_status text;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_logged_in'); end if;
  select artist_id, status::text into v_owner, v_status from public.albums where id = p_album_id for update;
  if not found then return jsonb_build_object('success', false, 'reason', 'not_found'); end if;
  if not public.is_admin(v_uid) then
    if v_owner is distinct from v_uid then return jsonb_build_object('success', false, 'reason', 'not_your_album'); end if;
    if v_status = 'approved' then return jsonb_build_object('success', false, 'reason', 'approved_album'); end if;
  end if;
  update public.music_tracks set album_id = null, track_number = null where album_id = p_album_id;
  delete from public.albums where id = p_album_id;
  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.set_track_album(uuid, uuid, int) from public, anon;
grant  execute on function public.set_track_album(uuid, uuid, int) to authenticated, service_role;
revoke execute on function public.delete_album(uuid) from public, anon;
grant  execute on function public.delete_album(uuid) to authenticated, service_role;
