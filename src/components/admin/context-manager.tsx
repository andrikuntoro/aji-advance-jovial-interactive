"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomContext } from "@/types/domain";

// Pre-defined presets matching the user's requirements
const PERSONA_PRESETS = {
  mature: {
    name: "Mature Persona",
    age: 50,
    gender: "Male",
    occupation: "Owner of a plastic parts manufacturing factory",
    demographics: "Married, 2 children (ages 15 and 10)",
    location: "Taipei (home and factory)",
    annualIncome: "27,000,000 NT plus company assets",
    backgroundWorkHistory: "Self-made entrepreneur, built the business over 25 years",
    backgroundFinancialSituation: "Most assets are tied to the business (factory, machinery)",
    backgroundLiquidityNeeds: "Has business loans using the company as collateral",
    backgroundLifestyleExpenditures: "Investing in new machinery, business loan installments",
    backgroundExistingCustomer: "Has credit-protection insurance, group insurance",
    backgroundInsuranceKnowledge: "Very limited — views insurance as an expense, not an asset",
    backgroundKeyPriorities: "Business survival and growth",
    personalityTraits: "Responsible parent, patient, practical and curious",
    personalityCommunicationStyle: "Asks thoughtful questions to understand better",
    personalityDecisionApproach: "Open to expert recommendations and guidance",
    additionalGoals: "Education > Grow My Wealth > Medical Protection > Life",
    additionalStory: "Previously, he utilized his parents' CPF to fund her education."
  },
  young_professional: {
    name: "Young Professional",
    age: 28,
    gender: "Female",
    occupation: "Senior Software Engineer at Tech Corp",
    demographics: "Single, no children",
    location: "Jakarta (apartment)",
    annualIncome: "450,000,000 IDR",
    backgroundWorkHistory: "Fast-tracking tech specialist with 6 years experience",
    backgroundFinancialSituation: "Good cash savings, active stock retail investor",
    backgroundLiquidityNeeds: "Planning to buy a house in 2 years",
    backgroundLifestyleExpenditures: "High dining, gym membership, gadgets",
    backgroundExistingCustomer: "Only basic company-provided medical card",
    backgroundInsuranceKnowledge: "Moderate — understands basic concept, skeptical about payout ease",
    backgroundKeyPriorities: "Wealth accumulation and liquidity",
    personalityTraits: "Ambitious, direct, tech-savvy and logical",
    personalityCommunicationStyle: "Expects quick points, hates sales pitch, wants numbers",
    personalityDecisionApproach: "Compares quotes online, highly analytical",
    additionalGoals: "Grow My Wealth > Medical Protection > Critical Illness",
    additionalStory: "Prefers digital channels and immediate answers."
  }
};

const SCENARIO_PRESETS = {
  appointment: {
    id: "scenario-appointment-setting",
    title: "Appointment Setting",
    type: "appointment_setting" as const,
    oneLiner: "Practice introducing yourself, stating the purpose of your call, handling objections, and securing an appointment.",
    objective: "This is an outbound call to a prospective client who is a customer of the UOB Bank.",
    difficulty: "beginner" as const,
    decisionLeadsSource: "Warm Lead i.e. Customers of the Bank",
    practiceObjectives: "Open with confidence by delivering a compelling introduction with your name, firm, and gaining permission.",
    commonObjections: [
      "Busy / Avoidance",
      "Already have insurance",
      "Please send me the information first",
      "I am not interested now"
    ],
    scorecard: {
      section1Name: "Client verification",
      section1Requirements: "The user must clearly identify themselves and the company to satisfy transparency standards.",
      section2Name: "Soft skills",
      section2Requirements: "Clear Delivery and respectful communication, good word choices that are not too technical. Building and maintaining rapport with the customer and patience dealing with very demanding clients.",
      section3Name: "Objection handling",
      section3Requirements: "Does the user genuinely acknowledge the client's concern before responding? Does the user transition naturally from acknowledging the objection to offering value?"
    }
  },
  fact_finding: {
    id: "scenario-fact-finding",
    title: "Fact Finding",
    type: "fact_finding" as const,
    oneLiner: "Discover customer goals, financial priorities, family needs, protection gaps, and planning concerns.",
    objective: "Engage the client in a conversation about their future goals, cash flows, and find real protection gaps.",
    difficulty: "intermediate" as const,
    decisionLeadsSource: "Cold Lead or Referral",
    practiceObjectives: "Ask open-ended questions, listen actively, and build trust to uncover financial needs.",
    commonObjections: [
      "I don't want to share too much personal information",
      "I need to discuss with my spouse first",
      "Why do you need all these details?"
    ],
    scorecard: {
      section1Name: "Rapport building",
      section1Requirements: "Trainee establishes a strong foundation of trust and outlines the confidentiality of data.",
      section2Name: "Needs identification",
      section2Requirements: "Asks open questions covering family, business loans, health history, and children's futures.",
      section3Name: "Summary & Alignment",
      section3Requirements: "Summarizes client needs back to them perfectly and secures agreement on the next meeting."
    }
  }
};

const FRAMEWORK_PRESETS = {
  "3f": {
    active: "3f" as const,
    feelText: "Does the user genuinely acknowledge the client's concern before responding? (e.g., 'I completely understand how you feel')",
    feltText: "Does the user transition naturally from acknowledging the objection to offering value, without sounding pushy? (e.g., 'Other business owners have felt the same way')",
    foundText: "Does the user reposition the conversation around the prospect's potential benefit? (e.g., 'But they found that by doing a review, they saved money')",
    captureText: "Get the prospect's attention by suggesting a hot or trending topic currently in the news.",
    contextText: "Build rapport, frame the conversation, and acknowledge the client's situation with a relatable scenario.",
    conflictText: "Identify and highlight potential financial risks to create urgency using pointed questions to prompt the client.",
    closureText: "Propose a clear solution and secure a follow-up meeting to discuss the client's specific needs."
  },
  "4c": {
    active: "4c" as const,
    feelText: "I understand that you have concerns regarding...",
    feltText: "Others in similar situations have experienced similar initial thoughts...",
    foundText: "What they realized upon further discussion was...",
    captureText: "Highlight the recent economic shift and interest rate changes impacting family factory owners.",
    contextText: "Bridge the gap between current assets tied up in business machinery and liquid family protection.",
    conflictText: "Prompt the prospect on what happens to factory debt obligations if major critical illnesses occur.",
    closureText: "Secure a brief 10-minute calendar lock next Thursday morning to show a tailored wealth protection blueprint."
  }
};

export default function ContextManager() {
  const [activeTab, setActiveTab] = useState<"persona" | "scenario" | "framework">("persona");
  const [context, setContext] = useState<CustomContext | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/admin/context")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to load context");
      })
      .then((data) => setContext(data))
      .catch((err) => {
        console.error(err);
        // Fallback to defaults
        setContext({
          persona: PERSONA_PRESETS.mature,
          scenario: SCENARIO_PRESETS.appointment,
          objectionFramework: FRAMEWORK_PRESETS["3f"]
        });
      });
  }, []);

  const handleSave = async () => {
    if (!context) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context)
      });
      if (res.ok) {
        setMessage({ text: "AI Knowledge Context successfully updated!", type: "success" });
      } else {
        throw new Error("API responded with an error");
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: "Failed to update AI Knowledge Context.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const loadPersonaPreset = (key: keyof typeof PERSONA_PRESETS) => {
    if (!context) return;
    setContext({
      ...context,
      persona: { ...PERSONA_PRESETS[key] }
    });
    setMessage({ text: `Loaded Client Persona preset: "${PERSONA_PRESETS[key].name}"`, type: "success" });
  };

  const loadScenarioPreset = (key: keyof typeof SCENARIO_PRESETS) => {
    if (!context) return;
    setContext({
      ...context,
      scenario: { ...SCENARIO_PRESETS[key] }
    });
    setMessage({ text: `Loaded Scenario Blueprint preset: "${SCENARIO_PRESETS[key].title}"`, type: "success" });
  };

  const loadFrameworkPreset = (key: "3f" | "4c") => {
    if (!context) return;
    setContext({
      ...context,
      objectionFramework: {
        ...context.objectionFramework,
        ...FRAMEWORK_PRESETS[key],
        active: key
      }
    });
    setMessage({ text: `Loaded Objection Handling Framework preset: ${key.toUpperCase()}`, type: "success" });
  };

  if (!context) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <span className="ml-3 text-blue-200">Loading dynamic AI contexts...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Configuration Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-white/10 bg-slate-900/60 backdrop-blur-lg">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Badge className="bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-1">
                  ✨ PREMIUM CONTEXT ENGINE
                </Badge>
                <h2 className="text-xl font-bold text-white">Dynamic AI Context & Prompt Manager</h2>
                <p className="text-xs text-blue-200/60">Configure real-time roleplay variables, skepticism parameters, and grading rules.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="py-1.5 px-3 text-xs"
                  onClick={() => {
                    setContext({
                      persona: PERSONA_PRESETS.mature,
                      scenario: SCENARIO_PRESETS.appointment,
                      objectionFramework: FRAMEWORK_PRESETS["3f"]
                    });
                    setMessage({ text: "Reset form to default Mature Persona & Appointment Setting presets.", type: "success" });
                  }}
                  disabled={isSaving}
                >
                  Reset Defaults
                </Button>
                <Button variant="primary" className="py-1.5 px-3 text-xs" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save AI Context"}
                </Button>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-white/5 mt-6 gap-2">
              {[
                { id: "persona", label: "👤 Client Persona" },
                { id: "scenario", label: "📋 Scenario Blueprint" },
                { id: "framework", label: "⚖️ Objection Framework" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-400 bg-blue-500/5 rounded-t-lg"
                      : "border-transparent text-blue-100/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {message && (
              <div
                className={`rounded-xl border p-3 text-sm flex justify-between items-center ${
                  message.type === "success"
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                    : "border-rose-500/30 bg-rose-950/20 text-rose-300"
                }`}
              >
                <span>{message.text}</span>
                <button className="text-xs opacity-75 hover:opacity-100" onClick={() => setMessage(null)}>
                  ✕
                </button>
              </div>
            )}

            {/* TAB 1: CLIENT PERSONA */}
            {activeTab === "persona" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <h3 className="text-sm font-bold text-blue-300 mb-2">⚡ Quick Load Client Persona Preset</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => loadPersonaPreset("mature")}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        context.persona.name === "Mature Persona"
                          ? "border-blue-500 bg-blue-950/50 text-blue-300"
                          : "border-white/10 bg-white/5 text-blue-100 hover:bg-white/10"
                      }`}
                    >
                      Mature Persona (Age 50, Businessman, Family)
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPersonaPreset("young_professional")}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        context.persona.name === "Young Professional"
                          ? "border-blue-500 bg-blue-950/50 text-blue-300"
                          : "border-white/10 bg-white/5 text-blue-100 hover:bg-white/10"
                      }`}
                    >
                      Young Professional (Age 28, Software Engineer)
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Persona Name</label>
                    <input
                      type="text"
                      value={context.persona.name}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, name: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Age</label>
                    <input
                      type="number"
                      value={context.persona.age}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, age: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Gender</label>
                    <input
                      type="text"
                      value={context.persona.gender}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, gender: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-200/80">Occupation</label>
                  <input
                    type="text"
                    value={context.persona.occupation}
                    onChange={(e) => setContext({
                      ...context,
                      persona: { ...context.persona, occupation: e.target.value }
                    })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Family Demographics</label>
                    <input
                      type="text"
                      value={context.persona.demographics}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, demographics: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Location</label>
                    <input
                      type="text"
                      value={context.persona.location}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, location: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-200/80">Annual Income & Assets</label>
                  <input
                    type="text"
                    value={context.persona.annualIncome}
                    onChange={(e) => setContext({
                      ...context,
                      persona: { ...context.persona, annualIncome: e.target.value }
                    })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-200/80">Background / Work History</label>
                  <textarea
                    rows={2}
                    value={context.persona.backgroundWorkHistory}
                    onChange={(e) => setContext({
                      ...context,
                      persona: { ...context.persona, backgroundWorkHistory: e.target.value }
                    })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Financial & Liquidity Position</label>
                    <textarea
                      rows={2}
                      value={context.persona.backgroundFinancialSituation}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, backgroundFinancialSituation: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Skepticism / Insurance Knowledge</label>
                    <textarea
                      rows={2}
                      value={context.persona.backgroundInsuranceKnowledge}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, backgroundInsuranceKnowledge: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Financial Priority Breakdown</label>
                    <input
                      type="text"
                      value={context.persona.additionalGoals}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, additionalGoals: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Primary Goal & Priorities</label>
                    <input
                      type="text"
                      value={context.persona.backgroundKeyPriorities}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, backgroundKeyPriorities: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Core Personality Traits</label>
                    <input
                      type="text"
                      value={context.persona.personalityTraits}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, personalityTraits: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Communication Style</label>
                    <input
                      type="text"
                      value={context.persona.personalityCommunicationStyle}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, personalityCommunicationStyle: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Decision Approach</label>
                    <input
                      type="text"
                      value={context.persona.personalityDecisionApproach}
                      onChange={(e) => setContext({
                        ...context,
                        persona: { ...context.persona, personalityDecisionApproach: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-200/80">Additional Backstory (Family/Historical Details)</label>
                  <textarea
                    rows={2}
                    value={context.persona.additionalStory}
                    onChange={(e) => setContext({
                      ...context,
                      persona: { ...context.persona, additionalStory: e.target.value }
                    })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: SCENARIO BLUEPRINT */}
            {activeTab === "scenario" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <h3 className="text-sm font-bold text-blue-300 mb-2">⚡ Quick Load Scenario Blueprint</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => loadScenarioPreset("appointment")}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        context.scenario.title === "Appointment Setting"
                          ? "border-blue-500 bg-blue-950/50 text-blue-300"
                          : "border-white/10 bg-white/5 text-blue-100 hover:bg-white/10"
                      }`}
                    >
                      Appointment Setting (Beginner)
                    </button>
                    <button
                      type="button"
                      onClick={() => loadScenarioPreset("fact_finding")}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        context.scenario.title === "Fact Finding"
                          ? "border-blue-500 bg-blue-950/50 text-blue-300"
                          : "border-white/10 bg-white/5 text-blue-100 hover:bg-white/10"
                      }`}
                    >
                      Fact Finding (Intermediate)
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Scenario Title</label>
                    <input
                      type="text"
                      value={context.scenario.title}
                      onChange={(e) => setContext({
                        ...context,
                        scenario: { ...context.scenario, title: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Lead Source Context</label>
                    <input
                      type="text"
                      value={context.scenario.decisionLeadsSource}
                      onChange={(e) => setContext({
                        ...context,
                        scenario: { ...context.scenario, decisionLeadsSource: e.target.value }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-200/80">Difficulty Level</label>
                    <select
                      value={context.scenario.difficulty}
                      onChange={(e) => setContext({
                        ...context,
                        scenario: { ...context.scenario, difficulty: e.target.value as any }
                      })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-200/80">Trainee Core Objective</label>
                  <input
                    type="text"
                    value={context.scenario.objective}
                    onChange={(e) => setContext({
                      ...context,
                      scenario: { ...context.scenario, objective: e.target.value }
                    })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-200/80">Trainee Specific Targets & Practice Outcomes</label>
                  <textarea
                    rows={2}
                    value={context.scenario.practiceObjectives}
                    onChange={(e) => setContext({
                      ...context,
                      scenario: { ...context.scenario, practiceObjectives: e.target.value }
                    })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/30 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-white">Dynamic AI Grading Rubric Cards</h3>
                  <p className="text-xs text-blue-200/60">Configure evaluation directives that will be injected straight into OpenAI's scorecard grader.</p>
                  
                  <div className="space-y-3">
                    <div className="grid gap-4 sm:grid-cols-3 items-center">
                      <input
                        type="text"
                        value={context.scenario.scorecard.section1Name}
                        onChange={(e) => setContext({
                          ...context,
                          scenario: {
                            ...context.scenario,
                            scorecard: { ...context.scenario.scorecard, section1Name: e.target.value }
                          }
                        })}
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-blue-300 font-semibold focus:outline-none"
                        placeholder="Section 1"
                      />
                      <input
                        type="text"
                        value={context.scenario.scorecard.section2Name}
                        onChange={(e) => setContext({
                          ...context,
                          scenario: {
                            ...context.scenario,
                            scorecard: { ...context.scenario.scorecard, section2Name: e.target.value }
                          }
                        })}
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-blue-300 font-semibold focus:outline-none"
                        placeholder="Section 2"
                      />
                      <input
                        type="text"
                        value={context.scenario.scorecard.section3Name}
                        onChange={(e) => setContext({
                          ...context,
                          scenario: {
                            ...context.scenario,
                            scorecard: { ...context.scenario.scorecard, section3Name: e.target.value }
                          }
                        })}
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-blue-300 font-semibold focus:outline-none"
                        placeholder="Section 3"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <textarea
                        rows={3}
                        value={context.scenario.scorecard.section1Requirements}
                        onChange={(e) => setContext({
                          ...context,
                          scenario: {
                            ...context.scenario,
                            scorecard: { ...context.scenario.scorecard, section1Requirements: e.target.value }
                          }
                        })}
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="Criteria requirements..."
                      />
                      <textarea
                        rows={3}
                        value={context.scenario.scorecard.section2Requirements}
                        onChange={(e) => setContext({
                          ...context,
                          scenario: {
                            ...context.scenario,
                            scorecard: { ...context.scenario.scorecard, section2Requirements: e.target.value }
                          }
                        })}
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="Criteria requirements..."
                      />
                      <textarea
                        rows={3}
                        value={context.scenario.scorecard.section3Requirements}
                        onChange={(e) => setContext({
                          ...context,
                          scenario: {
                            ...context.scenario,
                            scorecard: { ...context.scenario.scorecard, section3Requirements: e.target.value }
                          }
                        })}
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="Criteria requirements..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: OBJECTION FRAMEWORK */}
            {activeTab === "framework" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 mb-4">
                  <h3 className="text-sm font-bold text-white mb-3">⚖️ Active Objection Handling Framework</h3>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => loadFrameworkPreset("3f")}
                      className={`flex-1 rounded-2xl border p-4 text-left transition-all ${
                        context.objectionFramework.active === "3f"
                          ? "border-blue-500 bg-blue-950/30 ring-1 ring-blue-500"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">3F Method</span>
                        <Badge className="bg-blue-500/20 text-blue-300">Active</Badge>
                      </div>
                      <p className="text-xs text-blue-200/70 mt-1">Feel, Felt, Found: Empathetic acknowledgment leading to group validation and beneficial reframing.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => loadFrameworkPreset("4c")}
                      className={`flex-1 rounded-2xl border p-4 text-left transition-all ${
                        context.objectionFramework.active === "4c"
                          ? "border-blue-500 bg-blue-950/30 ring-1 ring-blue-500"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">4C Method</span>
                        <Badge className="bg-indigo-500/20 text-indigo-300">Active</Badge>
                      </div>
                      <p className="text-xs text-blue-200/70 mt-1">Capture, Context, Conflict, Closure: Hook industry topics, set relatable contexts, build critical urgency, close commitments.</p>
                    </button>
                  </div>
                </div>

                {context.objectionFramework.active === "3f" ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">F1</span>
                        <h4 className="text-sm font-bold text-blue-200">Feel Step (Acknowledgment & Empathy)</h4>
                      </div>
                      <textarea
                        rows={2}
                        value={context.objectionFramework.feelText || ""}
                        onChange={(e) => setContext({
                          ...context,
                          objectionFramework: { ...context.objectionFramework, feelText: e.target.value }
                        })}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="Acknowledgment guidelines..."
                      />
                    </div>

                    <div className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">F2</span>
                        <h4 className="text-sm font-bold text-blue-200">Felt Step (Validation & Pivot)</h4>
                      </div>
                      <textarea
                        rows={2}
                        value={context.objectionFramework.feltText || ""}
                        onChange={(e) => setContext({
                          ...context,
                          objectionFramework: { ...context.objectionFramework, feltText: e.target.value }
                        })}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="Validation guidelines..."
                      />
                    </div>

                    <div className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">F3</span>
                        <h4 className="text-sm font-bold text-blue-200">Found Step (Value Proposition & Reframe)</h4>
                      </div>
                      <textarea
                        rows={2}
                        value={context.objectionFramework.foundText || ""}
                        onChange={(e) => setContext({
                          ...context,
                          objectionFramework: { ...context.objectionFramework, foundText: e.target.value }
                        })}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="Reframing guidelines..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/15 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">C1</span>
                          <h4 className="text-sm font-bold text-indigo-200">Capture (Industry Hook)</h4>
                        </div>
                        <textarea
                          rows={2}
                          value={context.objectionFramework.captureText || ""}
                          onChange={(e) => setContext({
                            ...context,
                            objectionFramework: { ...context.objectionFramework, captureText: e.target.value }
                          })}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                          placeholder="Industry trend hooks..."
                        />
                      </div>

                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/15 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">C2</span>
                          <h4 className="text-sm font-bold text-indigo-200">Context (Relatability)</h4>
                        </div>
                        <textarea
                          rows={2}
                          value={context.objectionFramework.contextText || ""}
                          onChange={(e) => setContext({
                            ...context,
                            objectionFramework: { ...context.objectionFramework, contextText: e.target.value }
                          })}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                          placeholder="Relatability bridges..."
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/15 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">C3</span>
                          <h4 className="text-sm font-bold text-indigo-200">Conflict (Critical Urgency)</h4>
                        </div>
                        <textarea
                          rows={2}
                          value={context.objectionFramework.conflictText || ""}
                          onChange={(e) => setContext({
                            ...context,
                            objectionFramework: { ...context.objectionFramework, conflictText: e.target.value }
                          })}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                          placeholder="Conflict urgency points..."
                        />
                      </div>

                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/15 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">C4</span>
                          <h4 className="text-sm font-bold text-indigo-200">Closure (Call to Commitment)</h4>
                        </div>
                        <textarea
                          rows={2}
                          value={context.objectionFramework.closureText || ""}
                          onChange={(e) => setContext({
                            ...context,
                            objectionFramework: { ...context.objectionFramework, closureText: e.target.value }
                          })}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none"
                          placeholder="Call-to-commitment steps..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live System Prompt Panel */}
      <div className="space-y-6">
        <Card className="border border-blue-500/20 bg-slate-950/80 backdrop-blur-md">
          <CardHeader className="border-b border-white/5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400">●</span> OpenAI System Prompt Preview
              </h3>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                LIVE SYNC
              </Badge>
            </div>
            <p className="text-[10px] text-blue-200/50 mt-1">This shows exact context block injected into OpenAI Realtime / Chat APIs in real-time.</p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-xl bg-black/45 border border-white/5 p-3 font-mono text-[10px] leading-relaxed text-blue-100/90 max-h-[580px] overflow-y-auto whitespace-pre-wrap select-all">
              {`You are roleplaying as ${context.persona.name || "Tsing Lu"}, a ${context.persona.age || 50}-year-old ${context.persona.occupation || "Manufacturing business owner"}.

## Profile details
- Name: ${context.persona.name}
- Age: ${context.persona.age} years old (${context.persona.gender})
- Occupation: ${context.persona.occupation}
- Demographics: ${context.persona.demographics}
- Location: ${context.persona.location}
- Income & Assets: ${context.persona.annualIncome}
- Financial priorities: ${context.persona.backgroundKeyPriorities} (Priorities detail: ${context.persona.additionalGoals})
- Views insurance as: ${context.persona.backgroundInsuranceKnowledge}
- Backstory context: ${context.persona.additionalStory}

## Core Traits & Communication Rules
- Core Traits: ${context.persona.personalityTraits}
- Style: ${context.persona.personalityCommunicationStyle}
- Decision: ${context.persona.personalityDecisionApproach}
- You are busy and value your time — responses should be short (max 2-3 sentences), direct, efficient.
- You are analytical: you respond to data, concrete numbers, comparisons — not abstract promises.
- You don't trust agents easily — trust must be built incrementally.
- VARY how you express skepticism or interest — NEVER repeat the same phrase twice.

## Training Scenario
Scenario: ${context.scenario.title}
Trainee agent objective: ${context.scenario.objective}
Lead Source: ${context.scenario.decisionLeadsSource}
Practice Objective: ${context.scenario.practiceObjectives}

## Objection Handling Framework (${context.objectionFramework.active.toUpperCase()})
${context.objectionFramework.active === "3f" ? `You expect the agent to handle objections using the 3F framework:
1. Feel: Validate concerns. (e.g., "${context.objectionFramework.feelText}")
2. Felt: Pivot to other business owners. (e.g., "${context.objectionFramework.feltText}")
3. Found: Reframe around discovered value. (e.g., "${context.objectionFramework.foundText}")` : `You expect the agent to guide the conversation using the 4C framework:
1. Capture: Hook industry topics. (e.g., "${context.objectionFramework.captureText}")
2. Context: Set appropriate context/rapport. (e.g., "${context.objectionFramework.contextText}")
3. Conflict: Introduce urgency/risk. (e.g., "${context.objectionFramework.conflictText}")
4. Closure: Propose clear next steps. (e.g., "${context.objectionFramework.closureText}")`}

## Response Instructions
- Respond only in character as ${context.persona.name}. NEVER break character.
- Keep response length down to 2-3 sentences.
- If you decide the trainee earned a stage transition, append [STAGE:next_stage] at the end.`}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
