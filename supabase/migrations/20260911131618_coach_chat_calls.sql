-- Per-user rate limit voor de coach-chat Edge Function (zelfde opzet als ai_coach_calls).
--
-- De app praat vanaf nu echt met coach-chat (DeepSeek, gedeelde betaalde sleutel).
-- Append-only teller, alleen door de Edge Function geschreven met de service-role key.
-- De gebruiker mag zijn eigen rijen lezen, niet schrijven — anders reset hij zijn limiet.
--
-- Toegepast op productie via de Supabase MCP (apply_migration) op 2026-09-11.

create table if not exists public.coach_chat_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  called_at timestamptz not null default now()
);

alter table public.coach_chat_calls enable row level security;

create policy "coach_chat_calls_select_own" on public.coach_chat_calls
  for select using (auth.uid() = user_id);

grant select on public.coach_chat_calls to authenticated;

create index if not exists coach_chat_calls_user_time_idx
  on public.coach_chat_calls (user_id, called_at);
