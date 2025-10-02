import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { AgentStateType } from "../core/state";
import { getReviewAgentPrompt } from "../prompts/reviewAgent";
import { submitToSharePoint } from "../tools/sharepoint";
import { createLLM } from "../utils/llm";
import { clearRequestContext } from "../utils/stateUtils";
import { ReviewActionSchema } from "../schemas/reviewAction";
import { logger } from "../utils/logger";

/**
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

  logger.info("ReviewAgent started");

  try {
    const systemPrompt = getReviewAgentPrompt(state);
    const llmWithStructuredOutput = llm.withStructuredOutput(ReviewActionSchema);

    const result = await llmWithStructuredOutput.invoke([
      new SystemMessage(systemPrompt),
      ...state.messages,
    ]);

    logger.info("ReviewAgent action", {
      action: result.action_type,
      reasoning: result.reasoning,
    });

    switch (result.action_type) {
      case "confirm":
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
        return {
          mode: "ELICITATION" as const,
        };

      case "abandon":
        return {
          messages: [
            new AIMessage(
              `${result.response_to_user}\n\nFeel free to start a new request anytime!`
            ),
          ],
          ...clearRequestContext(),
        };

      case "clarify":
        return {
          messages: [new AIMessage(result.response_to_user)],
          mode: "REVIEW" as const,
        };

      default:
        logger.error("ReviewAgent unknown action", { action: result.action_type });
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
    logger.error("ReviewAgent error", error);

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
