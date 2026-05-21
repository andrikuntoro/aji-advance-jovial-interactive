# AJI — Advance Jovial Interactive

Production-ready MVP (text-first) AI insurance roleplay trainer for insurance agents.

## Product Summary

AJI helps trainees practice realistic insurance conversations with a persona-driven AI client, then receive transcript-based scoring and coaching feedback.

### MVP Scope Implemented
- Landing page
- Login page (Supabase auth placeholder UI)
- Trainee dashboard
- Scenario selection page
- Live roleplay page (chat UI)
- Results/scoring page
- Admin dashboard
- API placeholders:
  - `POST /api/roleplay/respond`
  - `POST /api/roleplay/score`
- Mock fallback mode if `OPENAI_API_KEY` is missing
- Supabase SQL schema + seed scripts

---

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase-ready schema
- OpenAI integration placeholders with mock fallback mode

---

## Brand / UX Direction

- Premium enterprise SaaS dashboard look
- Navy + electric blue + white palette
- Rounded cards, gradient accents, modern typography
- Product label: **AJI**
- Tagline: **Advance Jovial Interactive**

---

## Project Structure

```bash
src/
  app/
    api/roleplay/respond/route.ts
    api/roleplay/score/route.ts
    admin/page.tsx
    dashboard/page.tsx
    login/page.tsx
    roleplay/page.tsx
    results/page.tsx
    scenarios/page.tsx
    layout.tsx
    page.tsx
    globals.css
  components/
    layout/
      app-shell.tsx
      top-nav.tsx
    roleplay/
      chat-panel.tsx
    results/
      score-summary.tsx
    ui/
      badge.tsx
      button.tsx
      card.tsx
  lib/
    mock-data.ts
    roleplay-engine.ts
    utils.ts
  types/
    domain.ts
supabase/
  schema.sql
  seed.sql
.env.example
TODO.md
```

---

## Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment
Copy:
```bash
cp .env.example .env.local
```

Set values:
- `OPENAI_API_KEY` (optional for now)
- Supabase keys when wiring auth/database in runtime

### 3) Run development server
```bash
npm run dev
```

Open:
- http://localhost:3000

---

## API Behavior

### `POST /api/roleplay/respond`
Input:
- `sessionId`
- `scenarioId`
- `personaId`
- `traineeMessage`
- `conversation[]`

Output:
- Persona reply
- Objection status
- Trust level
- Mode (`mock` or `openai` placeholder)

### `POST /api/roleplay/score`
Input:
- `sessionId`
- `scenarioId`
- `personaId`
- `transcript[]`

Output:
- Overall score (0-100)
- Category scores
- Strengths
- Improvement areas
- Suggested better response
- Next recommended practice
- Mode (`mock` or `openai` placeholder)

---

## Supabase SQL

Run these in Supabase SQL editor:
1. `supabase/schema.sql`
2. `supabase/seed.sql`

Tables included:
- `users`
- `scenarios`
- `personas`
- `training_sessions`
- `conversation_messages`
- `score_reports`

---

## HeyGen LiveAvatar Future Integration (Prepared)

The architecture is intentionally text-first and includes placement comments where avatar output can attach later:
- Roleplay response endpoint designed as reusable source for voice/avatar layer
- UI card placeholder in roleplay view for avatar rendering slot
- App shell side note for planned avatar module

When integrating HeyGen later:
1. Keep text logic + scoring unchanged
2. Add voice stream / avatar rendering on top of `/api/roleplay/respond`
3. Sync transcript timestamps with avatar playback events

---

## Notes

- Current login is a UI placeholder; wire Supabase Auth next.
- OpenAI routes are currently safe placeholders with robust mock behavior to keep demo fully functional without API key.
- MVP focuses on realistic text roleplay and coaching workflow first.
