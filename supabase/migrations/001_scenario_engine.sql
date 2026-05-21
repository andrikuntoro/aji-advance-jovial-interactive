-- AJI Scenario Engine Migration 001
-- Adds trust_level and stage_repeat_count tracking to training_sessions.
-- Run this after the base schema.sql in Supabase SQL editor.

alter table training_sessions
  add column if not exists trust_level int not null default 30
    check (trust_level >= 0 and trust_level <= 100);

alter table training_sessions
  add column if not exists stage_repeat_count int not null default 0;

-- conversation_messages: add stage snapshot per message for transcript audit
alter table conversation_messages
  add column if not exists stage_at_time text
    check (stage_at_time in (
      'opening',
      'permission_to_continue',
      'needs_exploration',
      'objection_triggered',
      'value_reframe',
      'appointment_or_next_step',
      'closing',
      'completed'
    ));

comment on column training_sessions.trust_level is
  'Running trust level 0-100 computed per turn by the scenario engine.';

comment on column training_sessions.stage_repeat_count is
  'Number of consecutive turns the session has remained in the current stage. Used to force-advance stuck sessions.';

comment on column conversation_messages.stage_at_time is
  'The active stage when this message was recorded. Used by admin session detail view.';
