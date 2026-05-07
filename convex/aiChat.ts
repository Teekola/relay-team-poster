import { groq } from "@ai-sdk/groq";
import { generateText, Output } from "ai";
import { ConvexError, v } from "convex/values";
import {
   type Plan,
   type RawPlan,
   planSchema,
   rawPlanSchema,
} from "../lib/ai/plan-schema";
import {
   buildPlannerUserPrompt,
   PLANNER_SYSTEM_PROMPT,
   type RosterEntry,
} from "../lib/ai/prompt";
import { LAYOUTS } from "../lib/layouts";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

const layoutIdValidator = v.union(
   v.literal("relay2"),
   v.literal("relay3"),
   v.literal("relay4"),
   v.literal("relay6"),
   v.literal("relay7"),
   v.literal("relay10"),
   v.literal("relay25"),
);

const planArgValidator = v.object({
   confidentMatches: v.array(
      v.object({
         inputName: v.string(),
         athleteId: v.string(),
      }),
   ),
   ambiguousMatches: v.array(
      v.object({
         inputName: v.string(),
         candidateAthleteIds: v.array(v.string()),
      }),
   ),
   newAthletes: v.array(
      v.object({
         name: v.string(),
         nickname: v.optional(v.string()),
         gender: v.optional(v.union(v.literal("M"), v.literal("W"))),
      }),
   ),
   layoutId: layoutIdValidator,
   textValues: v.record(v.string(), v.string()),
   inputOrder: v.array(v.string()),
});

type ClarificationField = "eventName" | "teamName";
export type Clarification = { field: ClarificationField; question: string };

const CLARIFICATION_QUESTIONS: Record<ClarificationField, string> = {
   eventName: "Mikä on tapahtuma? (esim. Kotka-Jukola 2026)",
   teamName: "Mikä on joukkueen nimi? (esim. Angelniemen Ankkuri 1)",
};

const PLANNER_MODEL =
   "meta-llama/llama-4-scout-17b-16e-instruct" satisfies Parameters<
      typeof groq
   >[0];

function pickClarifications(
   plan: Plan,
   asked: ReadonlySet<string>,
): Clarification[] {
   const order: ClarificationField[] = ["eventName", "teamName"];
   const result: Clarification[] = [];
   for (const field of order) {
      if (asked.has(field)) continue;
      if (!plan.textValues[field]?.trim()) {
         result.push({ field, question: CLARIFICATION_QUESTIONS[field] });
      }
   }
   return result;
}

export const planTeam = action({
   args: {
      message: v.string(),
      previousPlan: v.optional(planArgValidator),
      correction: v.optional(v.string()),
      askedFields: v.optional(v.array(v.string())),
      clarificationAnswers: v.optional(v.record(v.string(), v.string())),
   },
   handler: async (
      ctx,
      args,
   ): Promise<{
      plan: Plan;
      defaultTemplateId: Id<"templates"> | null;
      clarifications: Clarification[];
   }> => {
      const message = args.message.trim();
      if (message.length === 0) {
         throw new ConvexError("Viesti on tyhjä.");
      }

      if (!process.env.GROQ_API_KEY) {
         throw new ConvexError(
            "AI ei ole konfiguroitu (GROQ_API_KEY puuttuu).",
         );
      }

      const roster: RosterEntry[] = await ctx.runQuery(
         api.athletes.listForClubMinimal,
         {},
      );

      let raw: RawPlan;
      try {
         raw = await generatePlan({
            message,
            roster,
            clarificationAnswers: args.clarificationAnswers,
            previousPlan: args.previousPlan,
            correction: args.correction,
         });
      } catch (caught) {
         const reason =
            caught instanceof Error ? caught.message : "Tuntematon virhe";
         throw new ConvexError(formatAiError(reason));
      }

      const rosterIds = new Set(roster.map((entry) => entry._id));
      let plan = withMessageTextFallback(
         normalisePlan(coercePlan(raw), rosterIds),
         message,
      );

      const totalRunners =
         plan.confidentMatches.length +
         plan.ambiguousMatches.length +
         plan.newAthletes.length;

      // The preview model sometimes returns all-empty buckets even when the
      // paste obviously contains names. Salvage those cases with a TS-side
      // heuristic so the user gets a usable plan card instead of an error.
      if (totalRunners === 0 && plan.inputOrder.length === 0) {
         const fallback = buildFallbackRunners(message, roster);
         if (fallback.inputOrder.length === 0) {
            throw new ConvexError(
               "AI ei tunnistanut yhtään juoksijaa viestistä. Tarkista että nimet on eroteltu selkeästi (esim. pilkulla tai rivinvaihdolla).",
            );
         }
         console.info("planTeam fallback", {
            extracted: fallback.inputOrder.length,
            confident: fallback.confidentMatches.length,
            ambiguous: fallback.ambiguousMatches.length,
            new: fallback.newAthletes.length,
         });
         plan = {
            ...plan,
            confidentMatches: fallback.confidentMatches,
            ambiguousMatches: fallback.ambiguousMatches,
            newAthletes: fallback.newAthletes,
            inputOrder: fallback.inputOrder,
         };
      }

      const layout = LAYOUTS[plan.layoutId];
      const templates: Doc<"templates">[] = await ctx.runQuery(
         api.templates.list,
         { aspect: layout.aspect },
      );
      const defaultTemplateId = templates[0]?._id ?? null;

      const askedFields = new Set(args.askedFields ?? []);
      const clarifications = pickClarifications(plan, askedFields);

      return { plan, defaultTemplateId, clarifications };
   },
});

async function generatePlan(args: {
   message: string;
   roster: RosterEntry[];
   clarificationAnswers?: Record<string, string>;
   previousPlan?: Plan;
   correction?: string;
}): Promise<RawPlan> {
   const prompt = buildPlannerUserPrompt(args);
   const modelId = process.env.PLANNER_MODEL?.trim() || PLANNER_MODEL;
   const startedAt = Date.now();

   try {
      const result = await generateText({
         model: groq(modelId),
         output: Output.object({ schema: rawPlanSchema }),
         system: PLANNER_SYSTEM_PROMPT,
         prompt,
         temperature: 0,
         maxRetries: 0,
         providerOptions: {
            groq: {
               structuredOutputs: true,
            },
         },
      });
      const ms = Date.now() - startedAt;
      const raw = result.output;
      console.info("planTeam ok", {
         modelId,
         ms,
         confident: raw.confidentMatches.length,
         ambiguous: raw.ambiguousMatches.length,
         new: raw.newAthletes.length,
         inputOrder: raw.inputOrder.length,
      });
      return raw;
   } catch (caught) {
      const ms = Date.now() - startedAt;
      const reason =
         caught instanceof Error ? caught.message : "Tuntematon virhe";
      console.warn("planTeam fail", { modelId, ms, reason });
      throw caught;
   }
}

function formatAiError(reason: string): string {
   if (isDailyQuotaError(reason)) {
      return "AI:n päivittäinen käyttöraja tuli vastaan. Yritä uudelleen, kun kiintiö nollautuu.";
   }

   const retrySeconds = getRetrySeconds(reason);
   if (/quota exceeded/i.test(reason)) {
      return "AI:n käyttöraja tuli vastaan. Yritä myöhemmin uudelleen.";
   }

   if (retrySeconds || isRetryableRateLimitError(reason)) {
      const roundedSeconds = retrySeconds
         ? Math.ceil(Number(retrySeconds))
         : null;
      return roundedSeconds
         ? `AI:n käyttöraja tuli vastaan. Yritä uudelleen ${roundedSeconds} sekunnin kuluttua.`
         : "AI:n käyttöraja tuli vastaan. Yritä hetken kuluttua uudelleen.";
   }

   if (isOverloadedError(reason)) {
      return "AI-malli on juuri nyt kuormittunut. Yritä hetken kuluttua uudelleen.";
   }

   if (/No object generated|response did not match schema/i.test(reason)) {
      return "AI ei saanut muodostettua käyttökelpoista ehdotusta. Yritä muotoilla viesti hieman toisin.";
   }

   return "AI-pyyntö epäonnistui. Yritä hetken kuluttua uudelleen.";
}

function isOverloadedError(reason: string): boolean {
   return /high demand|overloaded|model_overloaded|temporarily unavailable|service unavailable|503/i.test(
      reason,
   );
}

function isRetryableRateLimitError(reason: string): boolean {
   return getRetrySeconds(reason) !== null || isRateLimitError(reason);
}

function isRateLimitError(reason: string): boolean {
   return /quota exceeded|rate limit|too many requests|resource_exhausted/i.test(
      reason,
   );
}

function getRetrySeconds(reason: string): number | null {
   const value = reason.match(/retry in ([\d.]+)s/i)?.[1];
   return value ? Number(value) : null;
}

function isDailyQuotaError(reason: string): boolean {
   return /requests per day|per day|per[_\s-]*day|rpd|daily|generaterequestsperday/i.test(
      reason,
   );
}

function coercePlan(raw: RawPlan): Plan {
   const candidate = {
      confidentMatches: raw.confidentMatches,
      ambiguousMatches: raw.ambiguousMatches.filter(
         (match) => match.candidateAthleteIds.length > 0,
      ),
      newAthletes: raw.newAthletes.map((athlete) => ({
         name: athlete.name,
         ...(athlete.nickname ? { nickname: athlete.nickname } : {}),
         ...(athlete.gender === "M" || athlete.gender === "W"
            ? { gender: athlete.gender }
            : {}),
      })),
      layoutId: isPlanLayoutId(raw.layoutId) ? raw.layoutId : "relay3",
      textValues: {
         eventName: raw.textValues.eventName ?? "",
         teamName: raw.textValues.teamName ?? "",
      },
      inputOrder: raw.inputOrder,
   };

   return planSchema.parse(candidate);
}

function isPlanLayoutId(
   value: string | null | undefined,
): value is Plan["layoutId"] {
   return (
      value === "relay2" ||
      value === "relay3" ||
      value === "relay4" ||
      value === "relay6" ||
      value === "relay7" ||
      value === "relay10" ||
      value === "relay25"
   );
}

function withMessageTextFallback(plan: Plan, message: string): Plan {
   const inferred = inferTextValues(message);
   return {
      ...plan,
      textValues: {
         ...plan.textValues,
         eventName:
            plan.textValues.eventName?.trim() ||
            inferred.eventName ||
            plan.textValues.eventName ||
            "",
         teamName:
            plan.textValues.teamName?.trim() ||
            inferred.teamName ||
            plan.textValues.teamName ||
            "",
      },
   };
}

function inferTextValues(message: string): {
   eventName?: string;
   teamName?: string;
} {
   const compact = message.replace(/\s+/g, " ");
   const eventName = compact.match(/\bSM[\s-]*viesti\b(?:\s+\d{4})?/iu)?.[0];
   const clubTeamName =
      compact.match(/\b(?:Angelniemen|Angelinemen)\s+Ankkuri\s+\d+\b/iu)?.[0] ??
      compact.match(/\bAngA\s+\d+\b/iu)?.[0];
   const numberedTeamName =
      compact.match(/\b\d+\.\s*joukkue\b/iu)?.[0] ??
      compact.match(/\b\d+\s+joukkue\b/iu)?.[0] ??
      compact.match(/\bjoukkue\s+\d+\b/iu)?.[0];

   return { eventName, teamName: clubTeamName ?? numberedTeamName };
}

// Drops roster IDs the model hallucinated — otherwise bad references
// would reach the form and crash the live preview.
function normalisePlan(raw: Plan, rosterIds: Set<string>): Plan {
   return {
      ...raw,
      confidentMatches: raw.confidentMatches.filter((match) =>
         rosterIds.has(match.athleteId),
      ),
      ambiguousMatches: raw.ambiguousMatches
         .map((match) => ({
            inputName: match.inputName,
            candidateAthleteIds: match.candidateAthleteIds.filter((id) =>
               rosterIds.has(id),
            ),
         }))
         .filter((match) => match.candidateAthleteIds.length > 0),
   };
}

// Last-resort runner extraction when the AI returned all-empty buckets.
// Splits the paste on commas/newlines, filters out event/team-style
// tokens, and matches the remaining tokens against the roster using the
// same first-name / last-name / nickname / full-name rules the planner
// prompt asks the model to follow.
function buildFallbackRunners(
   message: string,
   roster: RosterEntry[],
): {
   confidentMatches: Plan["confidentMatches"];
   ambiguousMatches: Plan["ambiguousMatches"];
   newAthletes: Plan["newAthletes"];
   inputOrder: Plan["inputOrder"];
} {
   const tokens = extractCandidateNames(message);
   const confidentMatches: Plan["confidentMatches"] = [];
   const ambiguousMatches: Plan["ambiguousMatches"] = [];
   const newAthletes: Plan["newAthletes"] = [];
   const inputOrder: Plan["inputOrder"] = [];

   for (const token of tokens) {
      inputOrder.push(token);
      const matches = matchRosterEntries(token, roster);
      if (matches.length === 1) {
         confidentMatches.push({ inputName: token, athleteId: matches[0]._id });
      } else if (matches.length > 1) {
         ambiguousMatches.push({
            inputName: token,
            candidateAthleteIds: matches.slice(0, 5).map((m) => m._id),
         });
      } else {
         newAthletes.push({ name: token });
      }
   }

   return { confidentMatches, ambiguousMatches, newAthletes, inputOrder };
}

function extractCandidateNames(message: string): string[] {
   return message
      .split(/[,\n;]/)
      .map((token) => token.trim())
      .filter(isLikelyPersonalName);
}

function isLikelyPersonalName(token: string): boolean {
   if (token.length < 2 || token.length > 60) return false;
   if (/\d/.test(token)) return false;
   if (!/[a-zåäöéèêàâôûüñç]/i.test(token)) return false;
   if (
      /\b(jukola|venlat?|venlojen|tiomila|10mila|ssrv|sm[\s-]*viesti|25[\s-]*manna|nuorten\s+jukola|kainuu|joukkue|leg|lähtö|viesti)\b/i.test(
         token,
      )
   ) {
      return false;
   }
   return true;
}

function matchRosterEntries(
   token: string,
   roster: RosterEntry[],
): RosterEntry[] {
   const normalised = normaliseName(token);
   if (normalised.length === 0) return [];
   return roster.filter((entry) => {
      const fullName = normaliseName(entry.name);
      const parts = fullName.split(/\s+/);
      const nickname = entry.nickname ? normaliseName(entry.nickname) : null;
      return (
         fullName === normalised ||
         parts.includes(normalised) ||
         nickname === normalised
      );
   });
}

function normaliseName(value: string): string {
   return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
