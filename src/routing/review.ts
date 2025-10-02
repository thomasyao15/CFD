import { END } from "@langchain/langgraph";
import { AgentStateType } from "../core/state";

/**
 * Routes from ReviewAgent based on action taken.
 * If user wants to modify, route to ElicitationAgent.
 * Otherwise, end the turn.
 */
export function reviewRouter(state: AgentStateType): string {
  if (state.mode === "ELICITATION") {
    console.log("[ReviewRouter] Modification requested → ElicitationAgent");
    return "elicitationAgent";
  }

  console.log("[ReviewRouter] Review complete → END");
  return END;
}
