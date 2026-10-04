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
