import { AgentStateType } from "../state";

/**
 * Centralized state clearing utilities
 * Ensures consistent cleanup behavior across all agents
 */

/**
 * Clear request-related context only (preserves conversation history)
 * Used after: request submission, user abandonment
 */
export function clearRequestContext(): Partial<AgentStateType> {
  return {
    collectedFields: {},
    fieldsMarkedUnknown: [],
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
    fieldsMarkedUnknown: [],
    identifiedTeam: null,
    identifiedTeamName: null,
    sharepoint_item_url: null,
    submission_error: null,
    mode: "CHAT" as const,
  };
}
