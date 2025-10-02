import { z } from "zod";

/**
 * Zod schema for field extraction with structured output.
 * Used by LLM to extract field values from user messages.
 */
export const FieldExtractionSchema = z.object({
  updates: z
    .object({
      title: z.string().nullable(),
      detailed_description: z.string().nullable(),
      criticality: z.enum(["nice to have", "important to have", "necessary to have", "mission-critical to have", "not sure"]).nullable(),
      dependencies: z.string().nullable(),
      strategic_alignment: z.string().nullable(),
      benefits: z.string().nullable(),
      demand_sponsor: z.string().nullable(),
      risk: z.enum(["Risk to a Single Team", "Risk to Multiple Teams", "Risk to Whole of Fund", "not sure"]).nullable(),
      other_details: z.string().nullable(),
    })
    .describe(
      "Field values extracted from user's message. Set to null if not mentioned."
    ),

  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence level in the accuracy of extraction"),

  reasoning: z
    .string()
    .describe("Brief explanation of what was extracted"),

  followup_response: z
    .string()
    .describe("Natural conversational response acknowledging user input and asking for remaining fields"),

  user_wants_to_abandon: z
    .boolean()
    .describe("True if user wants to cancel/abandon this request"),
});

export type FieldExtraction = z.infer<typeof FieldExtractionSchema>;
