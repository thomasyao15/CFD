import { HumanMessage } from "@langchain/core/messages";
import { ActivityTypes } from "@microsoft/agents-activity";
import {
  AgentApplicationBuilder,
  TurnContext,
} from "@microsoft/agents-hosting";
import { buildGraph } from "../core/graph";

/**
 * Creates and configures the M365 Teams agent application.
 * Integrates the LangGraph multi-agent system with Microsoft Teams.
 */
export function createM365Agent() {
  const cfdAgent = new AgentApplicationBuilder().build();
  const graph = buildGraph();

  cfdAgent.onConversationUpdate("membersAdded", async (context: TurnContext) => {
    await context.sendActivity(
      "Hello! I'm the Consolidated Front Door assistant. How can I help you today?"
    );
  });

  cfdAgent.onActivity(ActivityTypes.Message, async (context) => {
    const userMessage = context.activity.text!;
    const conversationId = context.activity.conversation!.id;

    console.log(`\n[User] ${userMessage}`);

    const result = await graph.invoke(
      {
        messages: [new HumanMessage(userMessage)],
      },
      {
        configurable: { thread_id: conversationId },
      }
    );

    const lastMessage = result.messages[result.messages.length - 1];
    const responseText =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    console.log(`[Assistant] ${responseText}\n`);

    await context.sendActivity(responseText);
  });

  return cfdAgent;
}
