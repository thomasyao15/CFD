import { z } from "zod";
import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getReviewAgentPrompt } from "../prompts/reviewAgent";
import { submitToSharePoint } from "../tools/sharepoint";
import { createLLM } from "../utils/llmFactory";
import { clearRequestContext } from "../utils/stateClear";

/**
 * Zod schema for review action classification
 */
const ReviewActionSchema = z.object({
  action_type: z
    .enum(["confirm", "modify", "abandon", "clarify"])
    .describe("The action the user wants to take"),
  reasoning: z
    .string()
    .describe("Brief explanation of why you classified this action"),
  response_to_user: z
    .string()
    .describe(
      "Natural conversational response to the user based on their action"
    ),
});

/**
 * Review Agent (Phase 5)
 *
 * Analyzes user's response during review mode and takes appropriate action:
 * - confirm: Submit to SharePoint
 * - modify: Return to ELICITATION mode
 * - abandon: Clear state and return to CHAT
 * - clarify: Answer questions, stay in REVIEW
 */
export async function reviewAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const llm = createLLM();

  console.log("\n" + "=".repeat(60));
  console.log("📋 PHASE 5: REVIEW MODE");
  console.log("=".repeat(60));

  try {
    // Step 1: Classify user's action using structured output
    const systemPrompt = getReviewAgentPrompt(state);
    const llmWithStructuredOutput = llm.withStructuredOutput(ReviewActionSchema);

    console.log("[ReviewAgent] Analyzing user's review response...");
    const result = await llmWithStructuredOutput.invoke([
      new SystemMessage(systemPrompt),
      ...state.messages, // Include conversation history for context
    ]);

    console.log(`[ReviewAgent] Action: ${result.action_type}`);
    console.log(`[ReviewAgent] Reasoning: ${result.reasoning}`);

    // Step 2: Handle each action type
    switch (result.action_type) {
      case "confirm":
        console.log("[ReviewAgent] ✅ User confirmed - submitting to SharePoint");
        console.log("=".repeat(60) + "\n");

        // Submit to SharePoint
        const submissionResult = await submitToSharePoint(
          state.identifiedTeam!,
          state.collectedFields
        );

        if (submissionResult.success) {
          return {
            messages: [
              new AIMessage(
                `${result.response_to_user}\n\n` +
                  `Your request has been successfully submitted! You can track it here:\n${submissionResult.item_url}\n\n` +
                  `Is there anything else I can help you with?`
              ),
            ],
            sharepoint_item_url: submissionResult.item_url,
            ...clearRequestContext(), // Clear request context after successful submission
          };
        } else {
          return {
            messages: [
              new AIMessage(
                `I encountered an error while submitting your request: ${submissionResult.error}\n\n` +
                  `Would you like to try again?`
              ),
            ],
            submission_error: submissionResult.error,
            mode: "REVIEW" as const, // Stay in review to allow retry
          };
        }

      case "modify":
        console.log(
          "[ReviewAgent] 🔄 User wants to modify - returning to ELICITATION"
        );
        console.log("=".repeat(60) + "\n");

        return {
          messages: [
            new AIMessage(
              `${result.response_to_user}\n\nWhat would you like to change?`
            ),
          ],
          mode: "ELICITATION" as const, // Supervisor will route to ElicitationAgent
        };

      case "abandon":
        console.log("[ReviewAgent] ❌ User abandoned request - clearing state");
        console.log("=".repeat(60) + "\n");

        return {
          messages: [
            new AIMessage(
              `${result.response_to_user}\n\nFeel free to start a new request anytime!`
            ),
          ],
          ...clearRequestContext(), // Use centralized clear function
        };

      case "clarify":
        console.log(
          "[ReviewAgent] ❓ User has questions - answering and staying in REVIEW"
        );
        console.log("=".repeat(60) + "\n");

        return {
          messages: [new AIMessage(result.response_to_user)],
          mode: "REVIEW" as const, // Stay in review mode
        };

      default:
        // Fallback - should never happen with enum, but TypeScript safety
        console.error(`[ReviewAgent] Unknown action type: ${result.action_type}`);
        return {
          messages: [
            new AIMessage(
              "I'm not sure what you'd like to do. Could you please confirm if you want to submit, modify, or cancel this request?"
            ),
          ],
          mode: "REVIEW" as const,
        };
    }
  } catch (error) {
    console.error("[ReviewAgent] Error during review:", error);
    console.log("=".repeat(60) + "\n");

    // Fallback: Stay in review with error message
    return {
      messages: [
        new AIMessage(
          "I ran into an issue processing your response. Could you please let me know if you want to confirm, modify, or cancel this request?"
        ),
      ],
      mode: "REVIEW" as const,
    };
  }
}
