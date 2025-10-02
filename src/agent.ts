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
import { reviewAgent } from "./agents/reviewAgent";
import { routeAfterElicitation } from "./agents/checkCompletion";

// Debug: Check if LangSmith env vars are loaded
console.log("LANGCHAIN_TRACING_V2:", process.env.LANGCHAIN_TRACING_V2);
console.log("LANGCHAIN_API_KEY:", process.env.LANGCHAIN_API_KEY ? "SET" : "NOT SET");
console.log("LANGCHAIN_PROJECT:", process.env.LANGCHAIN_PROJECT);

// ============================================================================
// PHASE 5: REVIEW & SUBMISSION
// Full review flow with confirm/modify/abandon/clarify actions
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

  // Handle END signal (e.g., from "clear context" command)
  if (nextAgent === END || nextAgent === "") {
    return END;
  }

  // Route to the appropriate agent
  if (nextAgent === "elicitationAgent") {
    return "elicitationAgent";
  } else if (nextAgent === "reviewAgent") {
    return "reviewAgent";
  } else if (nextAgent === "chatAgent") {
    return "chatAgent";
  }

  // Default to chat agent
  return "chatAgent";
}

/**
 * Route from ReviewAgent based on action taken
 * If user wants to modify, route directly to ElicitationAgent
 * Otherwise, end the turn
 */
function routeAfterReview(state: AgentStateType): string {
  // If mode changed to ELICITATION, route to elicitationAgent
  if (state.mode === "ELICITATION") {
    console.log("[Router] ReviewAgent → ElicitationAgent (modify detected)");
    return "elicitationAgent";
  }

  // Otherwise, end (confirm/abandon/clarify all end)
  console.log("[Router] ReviewAgent → END");
  return END;
}

// ============================================================================
// LANGGRAPH CONSTRUCTION
// supervisor → (chatAgent | elicitationAgent | reviewAgent)
// elicitationAgent → [completion check] → teamMatching → reviewAgent → END
// reviewAgent can route back to ELICITATION (modify) or CHAT (abandon/submit)
// ============================================================================

const checkpointer = new MemorySaver();

const graphBuilder = new StateGraph(AgentState)
  .addNode("supervisor", supervisorAgent)
  .addNode("chatAgent", chatAgent)
  .addNode("elicitationAgent", elicitationAgent)
  .addNode("teamMatching", teamMatchingAgent)
  .addNode("reviewAgent", reviewAgent)
  // Start with supervisor
  .addEdge(START, "supervisor")
  // Supervisor routes conditionally to appropriate agent
  .addConditionalEdges("supervisor", routeToAgent, {
    chatAgent: "chatAgent",
    elicitationAgent: "elicitationAgent",
    reviewAgent: "reviewAgent",
    [END]: END, // Handle END signal (e.g., from "clear context")
  })
  // ChatAgent returns to user
  .addEdge("chatAgent", END)
  // ElicitationAgent checks completion before ending
  .addConditionalEdges("elicitationAgent", routeAfterElicitation, {
    elicitationAgent: END, // Still missing fields, return to user
    teamMatching: "teamMatching", // Complete, move to team matching
  })
  // Team matching goes to review (or back to CHAT if no team found)
  .addEdge("teamMatching", END)
  // Review agent conditionally routes based on action
  // - Modify: routes directly to elicitationAgent
  // - Confirm/Abandon/Clarify: ends
  .addConditionalEdges("reviewAgent", routeAfterReview, {
    elicitationAgent: "elicitationAgent",
    [END]: END,
  });

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