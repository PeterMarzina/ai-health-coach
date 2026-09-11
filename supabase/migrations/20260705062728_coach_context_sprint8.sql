-- Sprint 8: Deep Context Coach (claude-fable-5)
-- Drie nieuwe tabellen voor de coach-chat met volledige context + action tools:
--   coach_conversation_summaries  → "geheugen" van eerdere gesprekken (punt 7)
--   workout_plans                 → het door de coach gegenereerde/aangepaste plan (tool update_workout_plan)
--   lifestyle_recommendations     → concrete lifestyle-adviezen (tool add_lifestyle_recommendation)
-- Zelfde patronen als eerdere migraties: RLS op eigen rijen + expliciete GRANTs
-- (tabellen uit migraties krijgen geen automatische rechten voor `authenticated`,
-- zie de toelichting in 20260703084200_nutrition_recovery.sql).

create table if not exists public.coach_conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'chat' check (source in ('chat', 'intake')),
  summary text not null,
  created_at timestamptz not null default now()
);

alter table public.coach_conversation_summaries enable row level security;

create policy "coach_summaries_select_own" on public.coach_conversation_summaries
  for select using (auth.uid() = user_id);
create policy "coach_summaries_insert_own" on public.coach_conversation_summaries
  for insert with check (auth.uid() = user_id);
create policy "coach_summaries_delete_own" on public.coach_conversation_summaries
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.coach_conversation_summaries to authenticated;

create index if not exists coach_summaries_user_created_idx
  on public.coach_conversation_summaries (user_id, created_at desc);

create table if not exists public.workout_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan jsonb not null,
  source text not null default 'coach',
  updated_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;

create policy "workout_plans_select_own" on public.workout_plans
  for select using (auth.uid() = user_id);
create policy "workout_plans_insert_own" on public.workout_plans
  for insert with check (auth.uid() = user_id);
create policy "workout_plans_update_own" on public.workout_plans
  for update using (auth.uid() = user_id);

grant select, insert, update on public.workout_plans to authenticated;

create table if not exists public.lifestyle_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'other'
    check (category in ('sleep', 'stress', 'nutrition', 'activity', 'recovery', 'habits', 'other')),
  text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.lifestyle_recommendations enable row level security;

create policy "lifestyle_recs_select_own" on public.lifestyle_recommendations
  for select using (auth.uid() = user_id);
create policy "lifestyle_recs_insert_own" on public.lifestyle_recommendations
  for insert with check (auth.uid() = user_id);
create policy "lifestyle_recs_update_own" on public.lifestyle_recommendations
  for update using (auth.uid() = user_id);

grant select, insert, update on public.lifestyle_recommendations to authenticated;

create index if not exists lifestyle_recs_user_active_idx
  on public.lifestyle_recommendations (user_id, active, created_at desc);
