-- Sprint 1: username support for signup/login
-- Username is captured at signup (stored in auth.users raw_user_meta_data via
-- supabase.auth.signUp options.data) and committed to profiles.username once
-- the user finishes onboarding (that's the first point a session exists for
-- the RLS-protected insert). This function lets login resolve "username or
-- email" to an email address before calling signInWithPassword, checking the
-- committed profiles.username first and falling back to the signup metadata.

alter table public.profiles
  add column if not exists username text unique;

create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(coalesce(p.username, u.raw_user_meta_data ->> 'username')) = lower(p_username)
  limit 1;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;
