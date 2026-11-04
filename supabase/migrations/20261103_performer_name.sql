-- ═══════════════════════════════════════════════════════════════════════════
-- Credited performer for tracks (correct artist credit for SEO and display).
-- The uploader stays in artist_id; performer_name is shown as the artist when
-- set (e.g. a label or manager uploading for an artist). Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.music_tracks add column if not exists performer_name text;

do $$ begin
  alter table public.music_tracks
    add constraint music_tracks_performer_name_len check (performer_name is null or char_length(performer_name) <= 120);
exception when duplicate_object then null; end $$;

-- Fix the two tracks currently credited to their uploader (from the sitemap
-- review). Adjust or remove these lines if the credit should differ.
update public.music_tracks set performer_name = 'Ice Prince'
 where id = '31139d95-0fb3-40a9-a426-af378590424a' and performer_name is null;
update public.music_tracks set performer_name = 'Ajebutter22'
 where id = '2834aaf5-eac2-4c24-9fd6-32c42ae405d0' and performer_name is null;

-- Check
-- select id, title, performer_name from public.music_tracks where performer_name is not null;
