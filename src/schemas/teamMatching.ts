import { z } from "zod";

/**
 * Zod schema for team matching structured output.
 * Note: getAllTeamIds() will be imported dynamically to avoid circular dependencies.
 */
export const createTeamMatchingSchema = (teamIds: string[]) => {
  return z.object({
    team_id: z
      .enum(teamIds as [string, ...string[]])
      .nullable()
      .describe("ID of the best suited team, or null if no match"),

    confidence: z
      .number()
      .min(0)
      .max(100)
      .describe("Confidence level in the team selection (0-100)"),

    reasoning: z
      .string()
      .describe("Brief explanation of why this team was selected or why no match"),
  });
};

export type TeamMatchingResult = {
  team_id: string | null;
  confidence: number;
  reasoning: string;
};
