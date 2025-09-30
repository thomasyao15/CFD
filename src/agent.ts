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

// Debug: Check if LangSmith env vars are loaded
console.log("LANGCHAIN_TRACING_V2:", process.env.LANGCHAIN_TRACING_V2);
console.log("LANGCHAIN_API_KEY:", process.env.LANGCHAIN_API_KEY ? "SET" : "NOT SET");
console.log("LANGCHAIN_PROJECT:", process.env.LANGCHAIN_PROJECT);

// ============================================================================
// PHASE 2: SUPERVISOR + MODE ROUTING
// Multi-agent system with supervisor routing between chat and elicitation
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
// Supervisor pattern: supervisor → (chatAgent | elicitationAgent) → END
// One user message = one agent response (turn-based)
// ============================================================================

const checkpointer = new MemorySaver();

const graphBuilder = new StateGraph(AgentState)
  .addNode("supervisor", supervisorAgent)
  .addNode("chatAgent", chatAgent)
  .addNode("elicitationAgent", elicitationAgent)
  // Start with supervisor
  .addEdge(START, "supervisor")
  // Supervisor routes conditionally to either agent
  .addConditionalEdges("supervisor", routeToAgent, {
    chatAgent: "chatAgent",
    elicitationAgent: "elicitationAgent",
  })
  // Both agents go directly to END (return response to user)
  .addEdge("chatAgent", END)
  .addEdge("elicitationAgent", END);

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