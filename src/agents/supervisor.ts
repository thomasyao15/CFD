import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getSupervisorPrompt } from "../prompts/supervisor";
import { createLLM } from "../utils/llmFactory";
import { clearAll } from "../utils/stateClear";

/**
 * Supervisor agent that routes between ChatAgent and ElicitationAgent
 * Analyzes user intent and current mode to make routing decisions
 */
export async function supervisorAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  // Check for debug "clear context" command
  const lastMessage = state.messages[state.messages.length - 1];
  const userMessage = lastMessage?.content?.toString().trim().toLowerCase() || "";

  if (userMessage === "clear context") {
    console.log("[Supervisor] 🧹 Debug command: clearing all context");

    return {
      ...clearAll(),
      messages: [new AIMessage("Context has been cleared.")],
      next: "", // No routing - return control to user
    };
  }

  const llm = createLLM();
  const systemPrompt = getSupervisorPrompt(state.mode);

  // Get last 5 messages (or fewer if conversation is shorter) for better context
  const recentMessages = state.messages.slice(-5);

  // Ask the LLM to make a routing decision with recent conversation context
  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    ...recentMessages,
    new HumanMessage("Which agent should handle this?"),
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
