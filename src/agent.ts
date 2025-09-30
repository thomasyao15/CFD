import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, START, END, Annotation, MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ActivityTypes } from "@microsoft/agents-activity";
import {
  AgentApplicationBuilder,
  TurnContext,
} from "@microsoft/agents-hosting";

// Debug: Check if LangSmith env vars are loaded
console.log("LANGCHAIN_TRACING_V2:", process.env.LANGCHAIN_TRACING_V2);
console.log("LANGCHAIN_API_KEY:", process.env.LANGCHAIN_API_KEY ? "SET" : "NOT SET");
console.log("LANGCHAIN_PROJECT:", process.env.LANGCHAIN_PROJECT);

// ============================================================================
// PHASE 1: BASIC CHAT AGENT
// Simple conversational agent with no tools, no routing, just natural chat
// ============================================================================

export const cfdAgent = new AgentApplicationBuilder().build();

// Welcome message when user joins
cfdAgent.onConversationUpdate("membersAdded", async (context: TurnContext) => {
  await context.sendActivity(
    "Hello! I'm the Consolidated Front Door assistant. How can I help you today?"
  );
});

// ============================================================================
// STATE DEFINITION
// ============================================================================

const BasicState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// ============================================================================
// LLM INITIALIZATION (OpenAI GPT-5)
// ============================================================================

const llm = new ChatOpenAI({
  model: "gpt-5-nano",
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// SYSTEM PROMPT (GPT-5 Format with Markdown)
// ============================================================================

const SYSTEM_PROMPT = `**Role:**
You are a friendly, helpful assistant for internal employees.
You can chat about anything - answer general questions, discuss work topics, or just have a conversation.

**Instructions:**
1. Engage naturally with the user based on their message
2. Keep responses brief (2-3 sentences typical unless more detail is needed)
3. Be professional but friendly and conversational
4. Answer questions directly and clearly
5. If you don't know something, say so honestly

**Tone:**
Conversational, helpful, concise. Avoid being overly formal or robotic.`;

// ============================================================================
// CHATBOT NODE
// ============================================================================

async function chatbotNode(state: typeof BasicState.State) {
  // Add system prompt at the beginning if not already present
  const hasSystemMessage = state.messages.some(msg => msg._getType() === "system");
  const messages = hasSystemMessage
    ? state.messages
    : [new SystemMessage(SYSTEM_PROMPT), ...state.messages];

  const response = await llm.invoke(messages);
  return { messages: [response] };
}

// ============================================================================
// LANGGRAPH CONSTRUCTION
// Simple linear flow: START → chatbot → END
// With MemorySaver to maintain conversation context across turns
// ============================================================================

const checkpointer = new MemorySaver();

const graphBuilder = new StateGraph(BasicState)
  .addNode("chatbot", chatbotNode)
  .addEdge(START, "chatbot")
  .addEdge("chatbot", END);

const graph = graphBuilder.compile({ checkpointer });

// ============================================================================
// M365 AGENTS SDK INTEGRATION
// ============================================================================

cfdAgent.onActivity(ActivityTypes.Message, async (context) => {
  const userMessage = context.activity.text!;
  const conversationId = context.activity.conversation!.id;

  // Invoke the LangGraph with conversation-specific thread
  const result = await graph.invoke(
    {
      messages: [new HumanMessage(userMessage)],
    },
    {
      configurable: { thread_id: conversationId },
    }
  );

  // Extract the assistant's response
  const lastMessage = result.messages[result.messages.length - 1];
  const responseText =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  // Send response back to user
  await context.sendActivity(responseText);
});
