import { z } from "zod";
import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { AgentStateType } from "../state";
import { formatCollectedFieldsSummary } from "../tools/fieldExtraction";
import { getTeamById, getAllTeamIds, TeamDefinition } from "../config/teams";
import {
  getTeamMatchingPrompt,
  getNoMatchFoundPrompt,
} from "../prompts/teamMatching";
import { CollectedFields } from "../config/fields";

/**
 * Zod schema for team matching structured output
 */
const TeamMatchingSchema = z.object({
  team_id: z
    .enum(getAllTeamIds() as [string, ...string[]])
    .nullable()
    .describe(
      "ID of the team best suited to handle this request, or null if no suitable match"
    ),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence level in the team selection (0-100)"),
  reasoning: z
    .string()
    .describe(
      "Brief explanation of why this team was selected or why no match"
    ),
});

const llm = new ChatOpenAI({
  model: "gpt-5-nano",
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Format review message for user (no LLM call needed)
 * Displays collected information and explains the 4 possible actions
 */
function formatReviewMessage(
  fields: Partial<CollectedFields>,
  team: TeamDefinition,
  fieldsMarkedUnknown: string[]
): string {
  const summary = formatCollectedFieldsSummary(fields, fieldsMarkedUnknown);

  return `Perfect! I've gathered all the information and identified that the **${team.name}** is the best team to help with your request.

**Here's what I have:**
${summary}

**Assigned Team:** ${team.name}

**What would you like to do?**
- **Confirm** - Submit this request to the team
- **Modify** - Make changes to any of the information
- **Abandon** - Cancel this request
- **Ask questions** - I can clarify anything about your request

Please let me know how you'd like to proceed!`;
}

/**
 * Team Matching Agent (Phase 4)
 *
 * Analyzes collected fields and uses LLM to identify the best team to handle the request.
 * If no suitable team is found, generates a helpful response asking for more detail.
 */
export async function teamMatchingAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 PHASE 4: TEAM MATCHING");
  console.log("=".repeat(60));
  console.log("\nAll required fields have been collected!");
  console.log(
    "\n" +
      formatCollectedFieldsSummary(
        state.collectedFields,
        state.fieldsMarkedUnknown
      )
  );
  console.log("\n" + "=".repeat(60));

  try {
    // Step 1: Use LLM to match request to appropriate team
    const systemPrompt = getTeamMatchingPrompt(state);
    const llmWithStructuredOutput =
      llm.withStructuredOutput(TeamMatchingSchema);

    console.log("[TeamMatching] Analyzing request to identify best team...");
    const result = await llmWithStructuredOutput.invoke([
      new SystemMessage(systemPrompt),
    ]);

    console.log(
      `[TeamMatching] Result: team_id=${result.team_id}, confidence=${result.confidence}%`
    );
    console.log(`[TeamMatching] Reasoning: ${result.reasoning}`);

    // Step 2: Handle result based on whether team was found
    if (result.team_id !== null) {
      // Success: Team found - construct review message and transition to REVIEW mode
      const team = getTeamById(result.team_id);
      if (!team) {
        throw new Error(`Team not found: ${result.team_id}`);
      }

      console.log(`[TeamMatching] ✅ Matched to: ${team.name}`);
      console.log(`[TeamMatching] Transitioning to REVIEW mode`);
      console.log("=".repeat(60) + "\n");

      // Format review message (no LLM call needed)
      const reviewMessage = formatReviewMessage(
        state.collectedFields,
        team,
        state.fieldsMarkedUnknown
      );

      return {
        messages: [new AIMessage(reviewMessage)],
        identifiedTeam: team.id,
        identifiedTeamName: team.name,
        mode: "REVIEW" as const, // User will see review message and can choose action
      };
    } else {
      // No match found: Use separate LLM call with dedicated prompt
      console.log(
        "[TeamMatching] ❌ No suitable team found - generating helpful response"
      );
      console.log("=".repeat(60) + "\n");

      const noMatchPrompt = getNoMatchFoundPrompt(state);
      const helpfulResponse = await llm.invoke([
        new SystemMessage(noMatchPrompt),
      ]);

      const responseText =
        typeof helpfulResponse.content === "string"
          ? helpfulResponse.content
          : JSON.stringify(helpfulResponse.content);

      // Return to CHAT mode so user can provide more information
      return {
        messages: [new AIMessage(responseText)],
        mode: "CHAT" as const,
      };
    }
  } catch (error) {
    console.error("[TeamMatching] Error during team matching:", error);
    console.log("=".repeat(60) + "\n");

    // Fallback: Return to chat with error message
    return {
      messages: [
        new AIMessage(
          "I ran into an issue trying to identify the right team for your request. Let's try again - could you describe your issue in a bit more detail?"
        ),
      ],
      mode: "CHAT" as const,
    };
  }
}
