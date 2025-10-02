import { z } from "zod";

/**
 * Zod schema for review action classification.
 * Determines what action the user wants to take during review phase.
 */
export const ReviewActionSchema = z.object({
  action_type: z
    .enum(["confirm", "modify", "abandon", "clarify"])
    .describe("The action the user wants to take"),

  reasoning: z
    .string()
    .describe("Brief explanation of why you classified this action"),

  response_to_user: z
    .string()
    .describe("Natural conversational response based on their action"),
});

export type ReviewAction = z.infer<typeof ReviewActionSchema>;
