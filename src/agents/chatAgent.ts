import { SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getChatAgentPrompt } from "../prompts/chatAgent";
import { createLLM } from "../utils/llmFactory";

/**
 * ChatAgent handles general conversation
 * Responds naturally to user messages without structured data collection
 * Adapts behavior based on mode (CHAT/ELICITATION/REVIEW)
 */
export async function chatAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const llm = createLLM();

  // Generate mode-aware system prompt
  const systemPrompt = getChatAgentPrompt(state.mode);

  // Add system prompt if not already present
  const hasSystemMessage = state.messages.some(
    (msg) => msg.getType() === "system"
  );

  const messages = hasSystemMessage
    ? state.messages
    : [new SystemMessage(systemPrompt), ...state.messages];

  // Get response from LLM
  const response = await llm.invoke(messages);

  console.log(`[ChatAgent] Generated response (mode: ${state.mode})`);

  return {
    messages: [response],
  };
}
