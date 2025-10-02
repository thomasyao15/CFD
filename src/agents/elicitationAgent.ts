import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getElicitationAgentPrompt } from "../prompts/elicitationAgent";
import {
  FieldExtractionSchema,
  isValidFieldValue,
} from "../tools/fieldExtraction";
import { createLLM } from "../utils/llmFactory";
import { clearRequestContext } from "../utils/stateClear";

/**
 * ElicitationAgent - Simplified Single-Pass Implementation
 * Performs extraction + response generation in a single LLM call
 * Always analyzes full conversation history
 */
export async function elicitationAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const llm = createLLM();

  console.log("[ElicitationAgent] Extracting fields from conversation history");

  const systemPrompt = getElicitationAgentPrompt(state);

  // Get the latest user message for focus guidance
  const lastMessage = state.messages[state.messages.length - 1];
  const isFirstEntry = Object.keys(state.collectedFields).length === 0;

  // Build messages for structured output extraction
  const extractionMessages = [
    new SystemMessage(systemPrompt),
    ...state.messages, // Always pass full conversation history
  ];

  // Add focus instruction for subsequent turns
  if (!isFirstEntry && lastMessage.getType() === "human") {
    extractionMessages.push(
      new SystemMessage(
        `Focus on extracting from the latest user message: "${lastMessage.content}"\n\nBut also consider the full conversation history for context. Update any errors in the collected fields as needed.`
      )
    );
  }

  try {
    const llmWithStructuredOutput = llm.withStructuredOutput(
      FieldExtractionSchema
    );
    const extraction = await llmWithStructuredOutput.invoke(extractionMessages);

    console.log(`[ElicitationAgent] Reasoning: ${extraction.reasoning}`);
    console.log(
      `[ElicitationAgent] Response: ${extraction.followup_response.substring(
        0,
        100
      )}...`
    );

    // Check if user wants to abandon the request
    if (extraction.user_wants_to_abandon) {
      console.log("[ElicitationAgent] ❌ User abandoned request - clearing state");

      return {
        messages: [new AIMessage(extraction.followup_response)],
        ...clearRequestContext(),
      };
    }

    // Filter out invalid/empty values using centralized validation
    const nonNullUpdates = Object.fromEntries(
      Object.entries(extraction.updates).filter(([_, value]) =>
        isValidFieldValue(value)
      )
    );

    console.log(
      `[ElicitationAgent] Extracted ${
        Object.keys(nonNullUpdates).length
      } field updates, ${extraction.marked_unknown.length} marked unknown`
    );

    // Return the followup response from structured output (no second LLM call needed)
    // NOTE: Must manually merge because state reducers now use replacement semantics
    return {
      messages: [new AIMessage(extraction.followup_response)],
      collectedFields: { ...state.collectedFields, ...nonNullUpdates },
      fieldsMarkedUnknown: Array.from(
        new Set([...state.fieldsMarkedUnknown, ...extraction.marked_unknown])
      ),
    };
  } catch (error) {
    console.error("[ElicitationAgent] Error during extraction:", error);

    // Fallback: basic conversational response without extraction
    const fallbackResponse = await llm.invoke([
      new SystemMessage(systemPrompt),
      ...state.messages,
    ]);

    return { messages: [fallbackResponse] };
  }
}
