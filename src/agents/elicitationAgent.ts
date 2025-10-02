import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { AgentStateType } from "../core/state";
import { getElicitationAgentPrompt } from "../prompts/elicitationAgent";
import { FieldExtractionSchema } from "../schemas/fieldExtraction";
import { isValidFieldValue } from "../utils/validation";
import { createLLM } from "../utils/llm";
import { clearRequestContext } from "../utils/stateUtils";
import { logger } from "../utils/logger";

/**
 * Gathers required fields for request submission through conversational interaction.
 * Uses structured output to extract field values and generate natural responses.
 */
export async function elicitationAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const llm = createLLM();
  const isFirstEntry = Object.keys(state.collectedFields).length === 0;

  logger.debug("ElicitationAgent", { turn: isFirstEntry ? "first" : "subsequent" });

  const systemPrompt = getElicitationAgentPrompt(state);
  const lastMessage = state.messages[state.messages.length - 1];

  const extractionMessages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  if (!isFirstEntry && lastMessage.getType() === "human") {
    extractionMessages.push(
      new SystemMessage(
        `Focus on: "${lastMessage.content}"\n\nConsider full history for context.`
      )
    );
  }

  try {
    const llmWithStructuredOutput = llm.withStructuredOutput(FieldExtractionSchema);
    const extraction = await llmWithStructuredOutput.invoke(extractionMessages);

    logger.debug("ElicitationAgent extraction", {
      reasoning: extraction.reasoning,
      response: extraction.followup_response.substring(0, 100) + "...",
    });

    if (extraction.user_wants_to_abandon) {
      logger.info("User abandoned request");

      return {
        messages: [new AIMessage(extraction.followup_response)],
        ...clearRequestContext(),
      };
    }

    const nonNullUpdates = Object.fromEntries(
      Object.entries(extraction.updates).filter(([_, value]) =>
        isValidFieldValue(value)
      )
    );

    logger.info("ElicitationAgent extraction complete", {
      fieldsExtracted: Object.keys(nonNullUpdates).length,
    });

    // CRITICAL: Must manually merge because state reducers use replacement semantics
    return {
      messages: [new AIMessage(extraction.followup_response)],
      collectedFields: { ...state.collectedFields, ...nonNullUpdates },
    };
  } catch (error) {
    logger.error("ElicitationAgent extraction failed", error);

    const fallbackResponse = await llm.invoke([
      new SystemMessage(systemPrompt),
      ...state.messages,
    ]);

    return { messages: [fallbackResponse] };
  }
}
