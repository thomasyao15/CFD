import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { AgentStateType } from "../state";
import { getSupervisorPrompt } from "../prompts/supervisor";

const llm = new ChatOpenAI({
  model: "gpt-5-nano",
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Supervisor agent that routes between ChatAgent and ElicitationAgent
 * Analyzes user intent and current mode to make routing decisions
 */
export async function supervisorAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const systemPrompt = getSupervisorPrompt(state.mode);

  // Get the last user message for analysis
  // TODO: Consider more context or conversation history to decide routing
  const lastMessage = state.messages[state.messages.length - 1];
  const userMessage = lastMessage?.content || "";

  // Ask the LLM to make a routing decision
  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(
      `Latest user message: "${userMessage}"\n\nWhich agent should handle this?`
    ),
  ]);

  const decision = response.content.toString().trim().toLowerCase();

  // Parse the decision and update state
  let nextAgent = "chatAgent"; // Default fallback
  let newMode = state.mode; // Keep current mode by default

  if (
    decision.includes("elicitationagent") ||
    decision === "elicitationagent"
  ) {
    nextAgent = "elicitationAgent";
    newMode = "ELICITATION";
  } else if (
    decision.includes("reviewagent") ||
    decision === "reviewagent"
  ) {
    nextAgent = "reviewAgent";
    // Keep REVIEW mode - ReviewAgent will change it based on action
    newMode = "REVIEW";
  } else if (decision.includes("chatagent") || decision === "chatagent") {
    nextAgent = "chatAgent";
    // Keep current mode unchanged
    // This allows side questions during elicitation/review without losing context
    // Mode only changes when explicitly routing to elicitationAgent or reviewAgent
    newMode = state.mode;

    // TODO (Phase 3+): Add exit logic for ELICITATION mode
    // Currently, once in ELICITATION mode, we never exit back to CHAT
    // Need to detect:
    // 1. User abandonment ("cancel", "never mind", "forget it")
    // 2. Topic change (user starts completely new conversation)
    // 3. Successful submission (Phase 5 - natural exit point)
    // For Phase 2, this is acceptable as we're just proving routing works
  }

  console.log(
    `[Supervisor] Mode: ${state.mode} → ${newMode}, Routing to: ${nextAgent}`
  );

  return {
    next: nextAgent,
    mode: newMode,
  };
}
