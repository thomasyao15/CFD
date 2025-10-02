import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { AgentStateType } from "../core/state";
import { getSupervisorPrompt } from "../prompts/supervisor";
import { createLLM } from "../utils/llm";
import { clearAll } from "../utils/stateUtils";
import { logger } from "../utils/logger";

/**
 * Supervisor agent that routes between specialized agents.
 * Analyzes user intent and current mode to make routing decisions.
 */
export async function supervisorAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const userMessage = lastMessage?.content?.toString().trim().toLowerCase() || "";
  const isDevMode = process.env.DEV_MODE === "true";

  if (isDevMode && userMessage === "clear context") {
    logger.debug("Debug command: clearing all context");

    return {
      ...clearAll(),
      messages: [
        new AIMessage({
          content: "Context has been cleared.",
          additional_kwargs: { _clearHistory: true },
        }),
      ],
      next: END,
    };
  }

  const llm = createLLM();
  const systemPrompt = getSupervisorPrompt(state.mode);
  const recentMessages = state.messages.slice(-5);

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    ...recentMessages,
    new HumanMessage("Which agent should handle this?"),
  ]);

  const decision = response.content.toString().trim().toLowerCase();

  let nextAgent = "chatAgent";
  let newMode = state.mode;

  if (decision.includes("elicitationagent") || decision === "elicitationagent") {
    nextAgent = "elicitationAgent";
    newMode = "ELICITATION";
  } else if (decision.includes("reviewagent") || decision === "reviewagent") {
    nextAgent = "reviewAgent";
    newMode = "REVIEW";
  } else if (decision.includes("chatagent") || decision === "chatagent") {
    nextAgent = "chatAgent";
    newMode = state.mode;
  }

  logger.info("Supervisor routing", { mode: `${state.mode} → ${newMode}`, nextAgent });

  return {
    next: nextAgent,
    mode: newMode,
  };
}
