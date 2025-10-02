import { END } from "@langchain/langgraph";
import { AgentStateType } from "../core/state";

/**
 * Routes from supervisor to appropriate agent based on decision.
 * Handles END signal for clear context commands.
 */
export function supervisorRouter(state: AgentStateType): string {
  const nextAgent = state.next || "chatAgent";

  if (nextAgent === END || nextAgent === "") {
    return END;
  }

  if (nextAgent === "elicitationAgent") {
    return "elicitationAgent";
  } else if (nextAgent === "reviewAgent") {
    return "reviewAgent";
  } else if (nextAgent === "chatAgent") {
    return "chatAgent";
  }

  return "chatAgent";
}
