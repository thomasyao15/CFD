import { SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { AgentStateType } from "../state";
import { ELICITATION_AGENT_PROMPT } from "../prompts/elicitationAgent";

const llm = new ChatOpenAI({
  model: "gpt-5-nano",
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * ElicitationAgent stub for Phase 2
 * Phase 3 will implement full requirements gathering logic
 * For now, just acknowledges entry into elicitation mode
 */
export async function elicitationAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  // Add system prompt if not already present
  const hasSystemMessage = state.messages.some(
    (msg) => msg.getType() === "system"
  );

  const messages = hasSystemMessage
    ? state.messages
    : [new SystemMessage(ELICITATION_AGENT_PROMPT), ...state.messages];

  // Get response from LLM
  const response = await llm.invoke(messages);

  console.log(`[ElicitationAgent] Generated response (Phase 2 stub)`);

  return {
    messages: [response],
  };
}
