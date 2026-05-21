-- AJI MVP Supabase Schema
-- Run in Supabase SQL editor

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('trainee', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists scenarios (
  id text primary key,
  title text not null,
  type text not null check (type in ('appointment_setting', 'fact_finding', 'product_pitch')),
  objective text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now()
);

create table if not exists personas (
  id text primary key,
  name text not null,
  age int not null,
  occupation text not null,
  profile jsonb not null,
  behavior_guidelines jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  scenario_id text not null references scenarios(id) on delete restrict,
  persona_id text not null references personas(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int not null default 0,
  status text not null check (status in ('active', 'completed')),
  current_stage text not null default 'opening' check (
    current_stage in (
      'opening',
      'permission_to_continue',
      'needs_exploration',
      'objection_triggered',
      'value_reframe',
      'appointment_or_next_step',
      'closing',
      'completed'
    )
  ),
  stage_history jsonb not null default '["opening"]'::jsonb,
  objection_history jsonb not null default '[]'::jsonb,
  debug_state jsonb not null default '{}'::jsonb
);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  role text not null check (role in ('trainee', 'ai_client', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists score_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references training_sessions(id) on delete cascade,
  overall_score int not null check (overall_score >= 0 and overall_score <= 100),
  categories jsonb not null,
  strengths jsonb not null,
  improvement_areas jsonb not null,
  suggested_better_response text not null,
  next_recommended_practice text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_sessions_user_id on training_sessions(user_id);
create index if not exists idx_conversation_messages_session_id on conversation_messages(session_id);
create index if not exists idx_score_reports_session_id on score_reports(session_id);
