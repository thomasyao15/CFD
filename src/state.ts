import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

/**
 * Mode the agent is currently operating in
 */
export type AgentMode = "CHAT" | "ELICITATION";

/**
 * Shared state across all agents in the supervisor pattern
 */
export const AgentState = Annotation.Root({
  /**
   * Conversation history
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  /**
   * Current operational mode
   * - CHAT: General conversation
   * - ELICITATION: Gathering requirements for request submission
   */
  mode: Annotation<AgentMode>({
    reducer: (_, y) => y ?? "CHAT",
    default: () => "CHAT" as AgentMode,
  }),

  /**
   * Next agent to route to (set by supervisor)
   */
  next: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
});

export type AgentStateType = typeof AgentState.State;