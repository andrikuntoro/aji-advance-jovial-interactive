export type UserRole = "trainee" | "admin";

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type ScenarioType = "appointment_setting" | "fact_finding" | "product_pitch";

export interface Scenario {
  id: string;
  title: string;
  type: ScenarioType;
  objective: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  commonObjections: string[];
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  occupation: string;
  profile: string[];
  behaviorGuidelines: string[];
}

export type MessageRole = "trainee" | "ai_client" | "system";

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export type RoleplayStage =
  | "opening"
  | "permission_to_continue"
  | "needs_exploration"
  | "objection_triggered"
  | "value_reframe"
  | "appointment_or_next_step"
  | "closing"
  | "completed";

export interface TrainingSession {
  id: string;
  userId: string;
  scenarioId: string;
  personaId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  status: "active" | "completed";
  currentStage: RoleplayStage;
  stageHistory: RoleplayStage[];
  objectionHistory: string[];
}

export interface ScoreCategory {
  key:
    | "communication_clarity"
    | "rapport_building"
    | "empathy"
    | "needs_discovery"
    | "objection_handling"
    | "product_explanation"
    | "closing_ability"
    | "compliance_awareness";
  label: string;
  score: number;
  feedback: string;
}

export interface ScoreReport {
  id: string;
  sessionId: string;
  scenarioId: string;
  personaId: string;
  overallScore: number;
  categories: ScoreCategory[];
  strengths: string[];
  improvementAreas: string[];
  suggestedBetterResponse: string;
  nextRecommendedPractice: string;
  createdAt: string;
}

export interface RoleplayRespondRequest {
  sessionId: string;
  scenarioId: string;
  personaId: string;
  currentStage: RoleplayStage;
  stageHistory: RoleplayStage[];
  objectionHistory: string[];
  traineeMessage: string;
  conversation: Array<{
    role: MessageRole;
    content: string;
  }>;
  debugMode?: boolean;
  /** Language for AI prospect replies: "en" | "id" */
  lang?: "en" | "id";
}

export interface RoleplayRespondResponse {
  reply: string;
  objectionRaised: string | null;
  trustLevel: number;
  currentStage: RoleplayStage;
  nextStage: RoleplayStage;
  stageHistory: RoleplayStage[];
  objectionHistory: string[];
  mode: "mock" | "openai";
}

export interface RoleplayScoreRequest {
  sessionId: string;
  scenarioId: string;
  personaId: string;
  transcript: Array<{
    role: MessageRole;
    content: string;
  }>;
}

export interface RoleplayScoreResponse {
  report: Omit<ScoreReport, "id" | "createdAt">;
  mode: "mock" | "openai";
}

// ─────────────────────────────────────────────────────────
// Realtime Session Types
// ─────────────────────────────────────────────────────────

export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "active"
  | "ending"
  | "ended"
  | "error";

export type RealtimeStage =
  | "opening"
  | "rapport_building"
  | "needs_exploration"
  | "objection_triggered"
  | "objection_handling"
  | "value_reframe"
  | "closing"
  | "completed";

export type EmotionState =
  | "neutral"
  | "interested"
  | "skeptical"
  | "frustrated"
  | "open"
  | "thinking";

export interface LiveTranscriptEntry {
  id: string;
  role: "trainee" | "ai_client";
  text: string;
  timestamp: number;
  stage: RealtimeStage;
  isFinal: boolean;
}

export interface RealtimeSessionConfig {
  scenarioId: string;
  scenarioType: ScenarioType;
  scenarioTitle: string;
  scenarioObjective: string;
  lang: "en" | "id";
}

export interface RealtimeStageMeta {
  label: string;
  labelId: string;
  description: string;
  order: number;
}

export interface AvatarRendererProps {
  emotion: EmotionState;
  isSpeaking: boolean;
  connectionState: RealtimeConnectionState;
  /** TODO: HeyGen LiveAvatar stream URL will be injected here */
  heygenStreamUrl?: string;
  personaName?: string;
  personaAge?: number;
  personaOccupation?: string;
}

export interface CustomContext {
  persona: {
    name: string;
    age: number;
    gender: string;
    occupation: string;
    demographics: string;
    location: string;
    annualIncome: string;
    backgroundWorkHistory: string;
    backgroundFinancialSituation: string;
    backgroundLiquidityNeeds: string;
    backgroundLifestyleExpenditures: string;
    backgroundExistingCustomer: string;
    backgroundInsuranceKnowledge: string;
    backgroundKeyPriorities: string;
    personalityTraits: string;
    personalityCommunicationStyle: string;
    personalityDecisionApproach: string;
    additionalGoals: string;
    additionalStory: string;
  };
  scenario: {
    id: string;
    title: string;
    type: ScenarioType;
    oneLiner: string;
    objective: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    decisionLeadsSource: string;
    practiceObjectives: string;
    commonObjections: string[];
    scorecard: {
      section1Name: string;
      section1Requirements: string;
      section2Name: string;
      section2Requirements: string;
      section3Name: string;
      section3Requirements: string;
    };
  };
  objectionFramework: {
    active: "3f" | "4c";
    feelText?: string;
    feltText?: string;
    foundText?: string;
    captureText?: string;
    contextText?: string;
    conflictText?: string;
    closureText?: string;
  };
}


