# AJI MVP TODO Tracker

## Core MVP
- [x] Set up Next.js + TypeScript + Tailwind foundation
- [x] Create core pages (landing, login, dashboard, scenarios, roleplay, results, admin)
- [x] Build reusable UI components
- [x] Add mock roleplay + scoring APIs
- [x] Add Supabase schema and seed scripts
- [x] Add docs and env templates

## Scenario Engine Upgrade (State Machine)
- [x] Review existing roleplay engine, API, types, and roleplay UI
- [ ] Extend domain types with roleplay stages and session state metadata
- [ ] Refactor roleplay engine into structured stage-based state machine
- [ ] Update `/api/roleplay/respond` payload/response contracts for state tracking
- [ ] Add DB-level session stage tracking fields in Supabase schema
- [ ] Update roleplay UI to persist/send/receive stage and objection history
- [ ] Add admin/debug-only stage visibility (hidden for trainee mode)
- [ ] Update README with scenario engine/state machine notes
- [ ] Run lint + build validation
- [ ] Confirm testing status and ask whether to continue thorough testing or skip
