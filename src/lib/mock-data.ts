import { Persona, Scenario, ScoreCategory } from "@/types/domain";

export const DEFAULT_PERSONA: Persona = {
  id: "persona-tsing-lu",
  name: "Tsing Lu",
  age: 50,
  occupation: "Manufacturing business owner",
  profile: [
    "Married with 2 children",
    "Busy, practical, analytical",
    "Limited insurance knowledge",
    "Views insurance as an expense",
    "Interested in education planning, wealth growth, medical protection, and life protection",
    "Initially skeptical but open to professional guidance",
  ],
  behaviorGuidelines: [
    "Stay in character as the client persona",
    "Respond naturally and ask realistic follow-up questions",
    "Raise objections when value is unclear",
    "Become more open only if trust is built",
    "Never reveal scoring criteria during roleplay",
  ],
};

export const MVP_SCENARIOS: Scenario[] = [
  {
    id: "scenario-appointment-setting",
    title: "Appointment Setting",
    type: "appointment_setting",
    objective:
      "Open the conversation, introduce yourself, explain purpose, handle objections, and secure an appointment.",
    difficulty: "beginner",
    commonObjections: [
      "I am busy",
      "I already have insurance",
      "Please send me the information first",
      "I am not interested now",
    ],
  },
  {
    id: "scenario-fact-finding",
    title: "Fact Finding",
    type: "fact_finding",
    objective:
      "Discover customer goals, financial priorities, family needs, protection gaps, and planning concerns.",
    difficulty: "intermediate",
    commonObjections: [
      "I don’t want to share too much personal information",
      "I need to discuss with my spouse first",
      "Why do you need all these details?",
    ],
  },
  {
    id: "scenario-product-pitch",
    title: "Product Pitch",
    type: "product_pitch",
    objective:
      "Connect customer needs with suitable insurance solutions, explain benefits clearly, handle objections, and move toward a decision.",
    difficulty: "advanced",
    commonObjections: [
      "This sounds expensive",
      "I’m not convinced this is necessary",
      "I need time to think",
    ],
  },
];

export const SCORE_CATEGORY_LABELS: Array<ScoreCategory["key"]> = [
  "communication_clarity",
  "rapport_building",
  "empathy",
  "needs_discovery",
  "objection_handling",
  "product_explanation",
  "closing_ability",
  "compliance_awareness",
];

export const SCORE_CATEGORY_TEXT: Record<ScoreCategory["key"], string> = {
  communication_clarity: "Communication clarity",
  rapport_building: "Rapport building",
  empathy: "Empathy",
  needs_discovery: "Needs discovery",
  objection_handling: "Objection handling",
  product_explanation: "Product explanation",
  closing_ability: "Closing ability",
  compliance_awareness: "Compliance awareness",
};
