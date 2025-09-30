import { HumanMessage } from "@langchain/core/messages";
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { ActivityTypes } from "@microsoft/agents-activity";
import {
  AgentApplicationBuilder,
  TurnContext,
} from "@microsoft/agents-hosting";
import { AgentState, AgentStateType } from "./state";
import { supervisorAgent } from "./agents/supervisor";
import { chatAgent } from "./agents/chatAgent";
import { elicitationAgent } from "./agents/elicitationAgent";
import { teamMatchingAgent } from "./agents/teamMatching";
import { routeAfterElicitation } from "./agents/checkCompletion";

// Debug: Check if LangSmith env vars are loaded
console.log("LANGCHAIN_TRACING_V2:", process.env.LANGCHAIN_TRACING_V2);
console.log("LANGCHAIN_API_KEY:", process.env.LANGCHAIN_API_KEY ? "SET" : "NOT SET");
console.log("LANGCHAIN_PROJECT:", process.env.LANGCHAIN_PROJECT);

// ============================================================================
// PHASE 3: REQUIREMENTS ELICITATION LOOP
// Full implementation with field extraction, pre-population, and completion checking
// ============================================================================

export const cfdAgent = new AgentApplicationBuilder().build();

// Welcome message when user joins
cfdAgent.onConversationUpdate("membersAdded", async (context: TurnContext) => {
  await context.sendActivity(
    "Hello! I'm the Consolidated Front Door assistant. How can I help you today?"
  );
});

// ============================================================================
// ROUTING LOGIC
// ============================================================================

/**
 * Determines which agent to route to based on supervisor's decision
 */
function routeToAgent(state: AgentStateType): string {
  const nextAgent = state.next || "chatAgent";

  console.log(`[Router] Routing to: ${nextAgent}`);

  // Route to the appropriate agent or end
  if (nextAgent === "elicitationAgent") {
    return "elicitationAgent";
  } else if (nextAgent === "chatAgent") {
    return "chatAgent";
  }

  // Default to chat agent
  return "chatAgent";
}

// ============================================================================
// LANGGRAPH CONSTRUCTION
// supervisor → (chatAgent | elicitationAgent) → [completion check] → END or teamMatching
// ============================================================================

const checkpointer = new MemorySaver();

const graphBuilder = new StateGraph(AgentState)
  .addNode("supervisor", supervisorAgent)
  .addNode("chatAgent", chatAgent)
  .addNode("elicitationAgent", elicitationAgent)
  .addNode("teamMatching", teamMatchingAgent)
  // Start with supervisor
  .addEdge(START, "supervisor")
  // Supervisor routes conditionally to either agent
  .addConditionalEdges("supervisor", routeToAgent, {
    chatAgent: "chatAgent",
    elicitationAgent: "elicitationAgent",
  })
  // ChatAgent returns to user
  .addEdge("chatAgent", END)
  // ElicitationAgent checks completion before ending
  .addConditionalEdges("elicitationAgent", routeAfterElicitation, {
    elicitationAgent: END, // Still missing fields, return to user
    teamMatching: "teamMatching", // Complete, move to team matching
  })
  // Team matching ends the flow (Phase 4 stub)
  .addEdge("teamMatching", END);

const graph = graphBuilder.compile({ checkpointer });

// ============================================================================
// M365 AGENTS SDK INTEGRATION
// ============================================================================

cfdAgent.onActivity(ActivityTypes.Message, async (context) => {
  const userMessage = context.activity.text!;
  const conversationId = context.activity.conversation!.id;

  console.log(`\n[User] ${userMessage}`);

  // Invoke the LangGraph with conversation-specific thread
  const result = await graph.invoke(
    {
      messages: [new HumanMessage(userMessage)],
    },
    {
      configurable: { thread_id: conversationId },
    }
  );

  // Extract the assistant's response (last message)
  const lastMessage = result.messages[result.messages.length - 1];
  const responseText =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  console.log(`[Assistant] ${responseText}\n`);

  // Send response back to user
  await context.sendActivity(responseText);
});