import { SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../core/state";
import { getChatAgentPrompt } from "../prompts/chatAgent";
import { createLLM } from "../utils/llm";
import { logger } from "../utils/logger";

/**
 * Handles general conversation without structured data collection.
 * Adapts behavior based on mode (CHAT/ELICITATION/REVIEW).
 */
export async function chatAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const llm = createLLM();
  const systemPrompt = getChatAgentPrompt(state.mode);

  const hasSystemMessage = state.messages.some(
    (msg) => msg.getType() === "system"
  );

  const messages = hasSystemMessage
    ? state.messages
    : [new SystemMessage(systemPrompt), ...state.messages];

  const response = await llm.invoke(messages);

  logger.debug("ChatAgent generated response", { mode: state.mode });

  return {
    messages: [response],
  };
}
