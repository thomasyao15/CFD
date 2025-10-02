import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { CollectedFields } from "./config/fields";

/**
 * Mode the agent is currently operating in
 */
export type AgentMode = "CHAT" | "ELICITATION" | "TEAM_MATCHING" | "REVIEW";

/**
 * Shared state across all agents in the supervisor pattern
 */
export const AgentState = Annotation.Root({
  /**
   * Conversation history
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => {
      // Check if any new message has the clear history flag
      const shouldClear = y.some(
        (msg) => msg.additional_kwargs?._clearHistory === true
      );
      return shouldClear ? y : x.concat(y);
    },
    default: () => [],
  }),

  /**
   * Current operational mode
   * - CHAT: General conversation
   * - ELICITATION: Gathering requirements for request submission
   * - TEAM_MATCHING: Identifying the appropriate team (Phase 4)
   * - REVIEW: User reviewing collected data before submission (Phase 5)
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
   * Uses replacement semantics - agents must merge manually for incremental updates
   */
  collectedFields: Annotation<Partial<CollectedFields>>({
    reducer: (_, y) => y,
    default: () => ({}),
  }),

  /**
   * Fields that user explicitly said they don't know
   * Tracks which fields to stop asking about
   * Uses replacement semantics - agents must merge manually for incremental updates
   */
  fieldsMarkedUnknown: Annotation<string[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),

  /**
   * Identified team after team matching (Phase 4)
   */
  identifiedTeam: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null,
  }),

  /**
   * Display name of identified team
   */
  identifiedTeamName: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null,
  }),

  /**
   * SharePoint item URL after successful submission
   */
  sharepoint_item_url: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null,
  }),

  /**
   * Error message if submission failed
   */
  submission_error: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null,
  }),
});

export type AgentStateType = typeof AgentState.State;