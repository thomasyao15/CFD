import { AIMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { formatCollectedFieldsSummary } from "../tools/fieldExtraction";

/**
 * Team Matching Agent (Phase 4 Stub)
 *
 * This is a placeholder for Phase 4 implementation.
 * In Phase 4, this will:
 * - Analyze collected fields
 * - Match to appropriate team using rules/AI/vector search
 * - Update state with identified team
 * - Transition to review mode
 *
 * For now, it just logs that we've entered team matching.
 */
export async function teamMatchingAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 PHASE 4: TEAM MATCHING (STUB)");
  console.log("=".repeat(60));
  console.log("\nAll required fields have been collected!");
  console.log("\n" + formatCollectedFieldsSummary(
    state.collectedFields,
    state.fieldsMarkedUnknown
  ));
  console.log("\n" + "=".repeat(60));
  console.log("Phase 3 Complete ✅");
  console.log("Ready to implement Phase 4: Team Matching");
  console.log("=".repeat(60) + "\n");

  // For now, just return a message to the user
  return {
    messages: [
      new AIMessage("Great! I've collected all the necessary information. In Phase 4, I'll identify the right team to handle your request and proceed with submission. For now, this completes the Phase 3 demonstration!")
    ],
    mode: "TEAM_MATCHING" as const,
  };
}