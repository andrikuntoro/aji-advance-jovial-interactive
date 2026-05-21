-- AJI MVP Seed Data

insert into personas (id, name, age, occupation, profile, behavior_guidelines)
values (
  'persona-tsing-lu',
  'Tsing Lu',
  50,
  'Manufacturing business owner',
  '[
    "Married with 2 children",
    "Busy, practical, analytical",
    "Limited insurance knowledge",
    "Views insurance as an expense",
    "Interested in education planning, wealth growth, medical protection, and life protection",
    "Initially skeptical but open to professional guidance"
  ]'::jsonb,
  '[
    "Stay in character as the client persona",
    "Respond naturally",
    "Raise realistic objections",
    "Ask follow-up questions",
    "Become more open only if trust is built",
    "Never reveal scoring criteria during roleplay"
  ]'::jsonb
)
on conflict (id) do nothing;

insert into scenarios (id, title, type, objective, difficulty)
values
(
  'scenario-appointment-setting',
  'Appointment Setting',
  'appointment_setting',
  'Open the conversation, introduce self, explain call purpose, handle objections, and secure an appointment.',
  'beginner'
),
(
  'scenario-fact-finding',
  'Fact Finding',
  'fact_finding',
  'Discover customer goals, financial priorities, family needs, protection gaps, and planning concerns.',
  'intermediate'
),
(
  'scenario-product-pitch',
  'Product Pitch',
  'product_pitch',
  'Connect customer needs with suitable insurance solutions, explain benefits, handle objections, and move toward decision.',
  'advanced'
)
on conflict (id) do nothing;
