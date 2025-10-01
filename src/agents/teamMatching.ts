import { z } from "zod";
import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { AgentStateType } from "../state";
import { formatCollectedFieldsSummary } from "../tools/fieldExtraction";
import { getTeamById, getAllTeamIds } from "../config/teams";
import {
  getTeamMatchingPrompt,
  getNoMatchFoundPrompt,
} from "../prompts/teamMatching";

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
      // Success: Team found
      const team = getTeamById(result.team_id);
      if (!team) {
        throw new Error(`Team not found: ${result.team_id}`);
      }

      console.log(`[TeamMatching] ✅ Matched to: ${team.name}`);
      console.log("=".repeat(60) + "\n");

      // TODO: Phase 5 - This will transition to REVIEW mode
      // For now, we just confirm the match
      return {
        messages: [
          new AIMessage(
            `Perfect! Based on what you've shared, I've identified that the **${team.name}** is the best team to help with your request.\n\n` +
              `In Phase 5, you'll be able to review all the details before I submit this request to their queue. For now, this completes the Phase 4 demonstration!`
          ),
        ],
        identifiedTeam: team.id,
        identifiedTeamName: team.name,
        mode: "REVIEW" as const, // Phase 5 stub
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
