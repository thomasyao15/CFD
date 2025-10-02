import { AgentStateType } from "../core/state";

/**
 * Clear request-related context only (preserves conversation history)
 * Used after: request submission, user abandonment
 */
export function clearRequestContext(): Partial<AgentStateType> {
  return {
    collectedFields: {},
    identifiedTeam: null,
    identifiedTeamName: null,
    sharepoint_item_url: null,
    submission_error: null,
    mode: "CHAT" as const,
  };
}

/**
 * Clear ALL context including conversation history
 * Used only for: debug "clear context" command
 */
export function clearAll(): Partial<AgentStateType> {
  return {
    messages: [], // Clear conversation history
    collectedFields: {},
    identifiedTeam: null,
    identifiedTeamName: null,
    sharepoint_item_url: null,
    submission_error: null,
    mode: "CHAT" as const,
  };
}
