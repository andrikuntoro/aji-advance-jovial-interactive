import { DEFAULT_PERSONA, MVP_SCENARIOS, SCORE_CATEGORY_TEXT } from "@/lib/mock-data";
import { clamp } from "@/lib/utils";
import {
  RoleplayRespondRequest,
  RoleplayRespondResponse,
  RoleplayScoreRequest,
  RoleplayScoreResponse,
  RoleplayStage,
  ScoreCategory,
} from "@/types/domain";

const objectionKeywords = [
  "busy",
  "already have insurance",
  "send me information",
  "not interested",
  "expensive",
];

function detectPositiveSignals(text: string) {
  const lower = text.toLowerCase();
  const tokens = [
    "understand",
    "help",
    "plan",
    "family",
    "goal",
    "protect",
    "thanks",
    "appreciate",
  ];
  return tokens.some((token) => lower.includes(token));
}

function detectObjectionTrigger(text: string) {
  const lower = text.toLowerCase();
  return objectionKeywords.find((item) => lower.includes(item)) ?? null;
}

const stageOrder: RoleplayStage[] = [
  "opening",
  "permission_to_continue",
  "needs_exploration",
  "objection_triggered",
  "value_reframe",
  "appointment_or_next_step",
  "closing",
  "completed",
];

function getNextLinearStage(stage: RoleplayStage): RoleplayStage {
  const index = stageOrder.indexOf(stage);
  if (index < 0 || index === stageOrder.length - 1) return "completed";
  return stageOrder[index + 1];
}

function scenarioStageReply(
  scenarioType: "appointment_setting" | "fact_finding" | "product_pitch",
  stage: RoleplayStage,
  trustLevel: number
) {
  const lowTrust = trustLevel < 45;
  const midTrust = trustLevel >= 45 && trustLevel < 70;

  if (scenarioType === "appointment_setting") {
    if (stage === "opening")
      return "I’m Tsing Lu. I only have a short window right now—what is this regarding?";
    if (stage === "permission_to_continue")
      return lowTrust
        ? "I’m busy now. Why should I continue this call?"
        : "I can spare a minute. Please be concise.";
    if (stage === "needs_exploration")
      return "Before meeting, what exactly do you need to understand about my situation?";
    if (stage === "objection_triggered")
      return "I already have insurance and my schedule is tight. Why set another meeting?";
    if (stage === "value_reframe")
      return midTrust
        ? "If this is relevant, show me the practical value for my family."
        : "Give me one concrete reason this appointment is worth my time.";
    if (stage === "appointment_or_next_step")
      return "If we proceed, suggest a short slot and what we will cover.";
    if (stage === "closing")
      return "Alright, confirm the time and expected agenda.";
    return "Thank you. I’ll review this and proceed with the agreed next step.";
  }

  if (scenarioType === "fact_finding") {
    if (stage === "opening")
      return "I’m open to a short discussion, but I prefer practical questions.";
    if (stage === "permission_to_continue")
      return lowTrust
        ? "I don’t want to share too much yet. Why do you need this information?"
        : "Okay, what areas are you trying to understand first?";
    if (stage === "needs_exploration")
      return "Our concerns include education planning, medical costs, and business cashflow stability.";
    if (stage === "objection_triggered")
      return "Some questions feel too personal. How will this help me?";
    if (stage === "value_reframe")
      return "If your assessment is clear and useful, I can provide more details.";
    if (stage === "appointment_or_next_step")
      return "What specific data do you need next so we can identify gaps?";
    if (stage === "closing")
      return "Summarize the main gaps you see and what we should review next.";
    return "Understood. I’ll prepare the details for the next session.";
  }

  if (stage === "opening")
    return "I’m listening, but I don’t want a generic product pitch.";
  if (stage === "permission_to_continue")
    return lowTrust
      ? "I’m skeptical. Why should I hear this proposal now?"
      : "You can continue, but keep it relevant.";
  if (stage === "needs_exploration")
    return "Link this solution to my education, medical, and life protection priorities.";
  if (stage === "objection_triggered")
    return "This sounds expensive. I’m not convinced on value.";
  if (stage === "value_reframe")
    return midTrust
      ? "Show me the benefit-cost tradeoff in clear terms."
      : "I need practical proof this is not just another expense.";
  if (stage === "appointment_or_next_step")
    return "What are the concrete next steps if I want to evaluate this properly?";
  if (stage === "closing")
    return "If the numbers are reasonable, I’m willing to review a proposal.";
  return "Thanks. Share the summary and we can move forward from there.";
}

export function generateMockRoleplayReply(
  input: RoleplayRespondRequest
): RoleplayRespondResponse {
  const scenario = MVP_SCENARIOS.find((s) => s.id === input.scenarioId) ?? MVP_SCENARIOS[0];
  const hasPositiveSignal = detectPositiveSignals(input.traineeMessage);
  const objection = detectObjectionTrigger(input.traineeMessage);

  const baseTrust = clamp(28 + input.conversation.length * 3, 10, 90);
  const trustShift = (hasPositiveSignal ? 7 : -2) + (objection ? -4 : 2);
  const trustLevel = clamp(baseTrust + trustShift, 5, 95);

  const currentStage = input.currentStage ?? "opening";
  const stageHistory = input.stageHistory?.length ? input.stageHistory : [currentStage];
  const objectionHistory = input.objectionHistory ?? [];

  let nextStage: RoleplayStage = currentStage;

  if (currentStage === "completed") {
    nextStage = "completed";
  } else if (objection) {
    nextStage = "objection_triggered";
  } else if (currentStage === "objection_triggered") {
    nextStage = hasPositiveSignal ? "value_reframe" : "objection_triggered";
  } else if (currentStage === "value_reframe") {
    nextStage = trustLevel >= 60 ? "appointment_or_next_step" : "needs_exploration";
  } else if (currentStage === "appointment_or_next_step") {
    nextStage = trustLevel >= 68 ? "closing" : "needs_exploration";
  } else if (currentStage === "closing") {
    nextStage = "completed";
  } else {
    nextStage = getNextLinearStage(currentStage);
  }

  const updatedStageHistory =
    stageHistory[stageHistory.length - 1] === nextStage
      ? stageHistory
      : [...stageHistory, nextStage];

  const updatedObjectionHistory = objection ? [...objectionHistory, objection] : objectionHistory;

  const reply = objection
    ? `I still feel "${objection}" is a concern for me. Can you address it directly before we continue?`
    : scenarioStageReply(scenario.type, nextStage, trustLevel);

  return {
    reply: reply || "Can you clarify how this helps my current financial priorities?",
    objectionRaised: objection,
    trustLevel,
    currentStage,
    nextStage,
    stageHistory: updatedStageHistory,
    objectionHistory: updatedObjectionHistory,
    mode: "mock",
  };
}

export function generateMockScore(input: RoleplayScoreRequest): RoleplayScoreResponse {
  const traineeMessages = input.transcript.filter((m) => m.role === "trainee");
  const aiMessages = input.transcript.filter((m) => m.role === "ai_client");

  const interactionDepth = clamp(traineeMessages.length * 8, 20, 95);
  const balanceFactor = clamp(50 + (traineeMessages.length - aiMessages.length) * 3, 35, 90);
  const empathyBoost = traineeMessages.some((m) =>
    /understand|concern|important|appreciate|thank/i.test(m.content)
  )
    ? 12
    : 0;

  const base = clamp(Math.round((interactionDepth + balanceFactor) / 2 + empathyBoost), 30, 95);

  const categories: ScoreCategory[] = (
    Object.keys(SCORE_CATEGORY_TEXT) as Array<keyof typeof SCORE_CATEGORY_TEXT>
  ).map((key, index) => {
    const variance = ((index % 4) - 1) * 3;
    const score = clamp(base + variance, 25, 98);
    return {
      key,
      label: SCORE_CATEGORY_TEXT[key],
      score,
      feedback:
        score >= 75
          ? "Strong execution with good structure and confidence."
          : "Needs more precision, confidence, and customer-centric framing.",
    };
  });

  const overallScore = Math.round(
    categories.reduce((sum, item) => sum + item.score, 0) / categories.length
  );

  return {
    report: {
      sessionId: input.sessionId,
      overallScore,
      categories,
      strengths: [
        "Maintained conversation flow with professional tone",
        "Asked follow-up questions and attempted objection handling",
      ],
      improvementAreas: [
        "Quantify value more clearly for skeptical clients",
        "Use more empathetic framing before product details",
      ],
      suggestedBetterResponse:
        "That’s a fair concern, Mr. Tsing Lu. If you allow 15 minutes, I’ll focus only on options relevant to education planning and medical protection for your family.",
      nextRecommendedPractice:
        "Repeat Appointment Setting with emphasis on concise value proposition and objection handling.",
      personaId: DEFAULT_PERSONA.id,
      scenarioId: input.scenarioId,
    } as RoleplayScoreResponse["report"],
    mode: "mock",
  };
}
