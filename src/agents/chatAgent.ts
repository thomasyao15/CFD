import { SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { AgentStateType } from "../state";
import { CHAT_AGENT_PROMPT } from "../prompts/chatAgent";

const llm = new ChatOpenAI({
  model: "gpt-5-nano",
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * ChatAgent handles general conversation
 * Responds naturally to user messages without structured data collection
 */
export async function chatAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  // Add system prompt if not already present
  const hasSystemMessage = state.messages.some(
    (msg) => msg.getType() === "system"
  );

  const messages = hasSystemMessage
    ? state.messages
    : [new SystemMessage(CHAT_AGENT_PROMPT), ...state.messages];

  // Get response from LLM
  const response = await llm.invoke(messages);

  console.log(`[ChatAgent] Generated response`);

  return {
    messages: [response],
  };
}
