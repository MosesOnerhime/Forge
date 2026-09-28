-- Minimal Supabase-shaped schemas for local migration validation only.
-- Run in a disposable PostgreSQL database; this is not an app backend.
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('forge.test_user_id', true), '')::uuid;
$$;
create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean not null,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(path text) returns text[] language sql immutable as $$
  select string_to_array(path, '/');
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
