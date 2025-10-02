import { AgentStateType } from "../core/state";
import { getFirstTurnPrompt } from "./elicitation/first";
import { getSubsequentTurnPrompt } from "./elicitation/subsequent";

/**
 * Routes to appropriate elicitation prompt based on conversation state.
 */
export function getElicitationAgentPrompt(state: AgentStateType): string {
  const isFirstEntry = Object.keys(state.collectedFields).length === 0;

  return isFirstEntry
    ? getFirstTurnPrompt()
    : getSubsequentTurnPrompt(state);
}
