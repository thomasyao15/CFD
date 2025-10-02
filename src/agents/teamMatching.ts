import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { AgentStateType } from "../core/state";
import {
  formatCollectedFieldsSummary,
  formatCollectedFieldsForUser,
} from "../utils/formatting";
import { TEAMS } from "../config/teams";
import {
  getTeamMatchingPrompt,
  getNoMatchFoundPrompt,
} from "../prompts/teamMatching";
import { CollectedFields } from "../config/fields";
import { TeamDefinition } from "../config/teams";
import { createLLM } from "../utils/llm";
import { createTeamMatchingSchema } from "../schemas/teamMatching";
import { logger } from "../utils/logger";

function formatReviewMessage(
  fields: Partial<CollectedFields>,
  team: TeamDefinition
): string {
  const summary = formatCollectedFieldsForUser(fields);

  return `Perfect! I've gathered all the information and identified that the **${team.name}** is the best team to help with your request.

Here's what I have:
${summary}

Is there anything you'd like to change? If you are happy with this, I can submit this for you.`;
}

/**
 * Analyzes collected fields to identify the best team to handle the request.
 * If no suitable team is found, asks for more details.
 */
export async function teamMatchingAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const llm = createLLM();

  logger.info("TeamMatching started");
  logger.debug("Collected fields", formatCollectedFieldsSummary(state.collectedFields));

  try {
    const systemPrompt = getTeamMatchingPrompt(state);
    const teamIds = TEAMS.map(t => t.id);
    const TeamMatchingSchema = createTeamMatchingSchema(teamIds);
    const llmWithStructuredOutput = llm.withStructuredOutput(TeamMatchingSchema);

    const result = await llmWithStructuredOutput.invoke([
      new SystemMessage(systemPrompt),
    ]);

    logger.info("TeamMatching result", {
      team: result.team_id,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });

    if (result.team_id !== null) {
      const team = TEAMS.find(t => t.id === result.team_id);
      if (!team) {
        throw new Error(`Team not found: ${result.team_id}`);
      }

      const reviewMessage = formatReviewMessage(state.collectedFields, team);

      return {
        messages: [new AIMessage(reviewMessage)],
        identifiedTeam: team.id,
        identifiedTeamName: team.name,
        mode: "REVIEW" as const,
      };
    } else {
      logger.info("No suitable team found");

      const noMatchPrompt = getNoMatchFoundPrompt(state);
      const helpfulResponse = await llm.invoke([
        new SystemMessage(noMatchPrompt),
      ]);

      const responseText =
        typeof helpfulResponse.content === "string"
          ? helpfulResponse.content
          : JSON.stringify(helpfulResponse.content);

      return {
        messages: [new AIMessage(responseText)],
        mode: "CHAT" as const,
      };
    }
  } catch (error) {
    logger.error("TeamMatching error", error);

    return {
      messages: [
        new AIMessage(
          "I ran into an issue trying to identify the right team for your request. Let's try again - could you describe your issue in a bit more detail?"
        ),
      ],
      mode: "CHAT" as const,
    };
  }
}
