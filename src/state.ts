import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { CollectedFields } from "./config/fields";

/**
 * Mode the agent is currently operating in
 */
export type AgentMode = "CHAT" | "ELICITATION" | "TEAM_MATCHING";

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
   * - TEAM_MATCHING: Identifying the appropriate team (Phase 4)
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

  /**
   * Collected field values during elicitation
   * Merges updates to allow incremental field collection
   */
  collectedFields: Annotation<Partial<CollectedFields>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),

  /**
   * Fields that user explicitly said they don't know
   * Tracks which fields to stop asking about
   */
  fieldsMarkedUnknown: Annotation<string[]>({
    reducer: (x, y) => Array.from(new Set([...x, ...y])),
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentState.State;