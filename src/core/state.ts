import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { CollectedFields } from "../config/fields";
import { AgentMode } from "./types";

/**
 * Shared state across all agents in the multi-agent system.
 * Uses LangGraph's Annotation API for type-safe state management.
 */
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => {
      const shouldClear = y.some(
        (msg) => msg.additional_kwargs?._clearHistory === true
      );
      return shouldClear ? y : x.concat(y);
    },
    default: () => [],
  }),

  mode: Annotation<AgentMode>({
    reducer: (_, y) => y ?? "CHAT",
    default: () => "CHAT" as AgentMode,
  }),

  next: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),

  collectedFields: Annotation<Partial<CollectedFields>>({
    reducer: (_, y) => y,
    default: () => ({}),
  }),

  identifiedTeam: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null,
  }),

  identifiedTeamName: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null,
  }),

  sharepoint_item_url: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null,
  }),

  submission_error: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null,
  }),
});

export type AgentStateType = typeof AgentState.State;
