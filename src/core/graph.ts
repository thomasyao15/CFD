import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentState } from "./state";
import { supervisorAgent } from "../agents/supervisor";
import { chatAgent } from "../agents/chatAgent";
import { elicitationAgent } from "../agents/elicitationAgent";
import { teamMatchingAgent } from "../agents/teamMatching";
import { reviewAgent } from "../agents/reviewAgent";
import { supervisorRouter } from "../routing/supervisor";
import { elicitationRouter } from "../routing/elicitation";
import { reviewRouter } from "../routing/review";

/**
 * Builds the LangGraph multi-agent workflow.
 * Architecture: Supervisor pattern with conditional routing.
 */
export function buildGraph() {
  const checkpointer = new MemorySaver();

  return new StateGraph(AgentState)
    .addNode("supervisor", supervisorAgent)
    .addNode("chatAgent", chatAgent)
    .addNode("elicitationAgent", elicitationAgent)
    .addNode("teamMatching", teamMatchingAgent)
    .addNode("reviewAgent", reviewAgent)
    .addEdge(START, "supervisor")
    .addConditionalEdges("supervisor", supervisorRouter, {
      chatAgent: "chatAgent",
      elicitationAgent: "elicitationAgent",
      reviewAgent: "reviewAgent",
      [END]: END,
    })
    .addEdge("chatAgent", END)
    .addConditionalEdges("elicitationAgent", elicitationRouter, {
      elicitationAgent: END,
      teamMatching: "teamMatching",
    })
    .addEdge("teamMatching", END)
    .addConditionalEdges("reviewAgent", reviewRouter, {
      elicitationAgent: "elicitationAgent",
      [END]: END,
    })
    .compile({ checkpointer });
}
