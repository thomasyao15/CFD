import { ChatOpenAI, AzureChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Model name → Azure deployment name mapping
 * Can be overridden via environment variables: AZURE_OPENAI_DEPLOYMENT_<MODEL_NAME>
 */
const MODEL_TO_AZURE_DEPLOYMENT: Record<string, string> = {
  "gpt-5-nano":
    process.env.AZURE_OPENAI_DEPLOYMENT_GPT5_NANO || "gpt-5-nano-deployment",
  "gpt-5-mini":
    process.env.AZURE_OPENAI_DEPLOYMENT_GPT5_MINI || "gpt-5-mini-deployment",
};

/**
 * Creates an LLM instance based on the configured provider
 * @param config - Optional LLM configuration (model name, temperature, max tokens)
 * @returns BaseChatModel instance (ChatOpenAI or AzureChatOpenAI)
 * @throws Error if required environment variables are missing or provider is unsupported
 */
export function createLLM(config: LLMConfig = {}): BaseChatModel {
  const provider = process.env.LLM_PROVIDER?.toLowerCase() || "openai";
  const model = config.model || process.env.LLM_MODEL || "gpt-5-nano";

  console.log(`[LLM Factory] Using provider: ${provider}, model: ${model}`);

  const fullConfig = { ...config, model };

  if (provider === "azure") {
    return createAzureLLM(fullConfig);
  } else if (provider === "openai") {
    return createOpenAILLM(fullConfig);
  } else {
    throw new Error(
      `Unsupported LLM_PROVIDER: ${provider}. Use 'openai' or 'azure'.`
    );
  }
}

/**
 * Creates an Azure OpenAI LLM instance
 */
function createAzureLLM(config: Required<Pick<LLMConfig, 'model'>> & LLMConfig): BaseChatModel {
  const azureApiKey =
    process.env.SECRET_AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION;

  // Validate required Azure environment variables
  if (!azureApiKey) {
    throw new Error(
      "Missing required environment variable: SECRET_AZURE_OPENAI_API_KEY or AZURE_OPENAI_API_KEY"
    );
  }
  if (!azureEndpoint) {
    throw new Error(
      "Missing required environment variable: AZURE_OPENAI_ENDPOINT"
    );
  }
  if (!azureApiVersion) {
    throw new Error(
      "Missing required environment variable: AZURE_OPENAI_API_VERSION"
    );
  }

  const deploymentName = MODEL_TO_AZURE_DEPLOYMENT[config.model];
  if (!deploymentName) {
    throw new Error(
      `No Azure deployment mapping found for model: ${config.model}. ` +
        `Add mapping in MODEL_TO_AZURE_DEPLOYMENT or set AZURE_OPENAI_DEPLOYMENT_${config.model
          .toUpperCase()
          .replace(/-/g, "_")}`
    );
  }

  // Extract instance name from endpoint URL (e.g., https://myresource.openai.azure.com -> myresource)
  const instanceName = azureEndpoint.split(".")[0].split("//")[1];

  return new AzureChatOpenAI({
    modelName: config.model, // For logging/tracing
    azureOpenAIApiKey: azureApiKey,
    azureOpenAIApiInstanceName: instanceName,
    azureOpenAIApiDeploymentName: deploymentName,
    azureOpenAIApiVersion: azureApiVersion,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });
}

/**
 * Creates an OpenAI LLM instance
 */
function createOpenAILLM(config: Required<Pick<LLMConfig, 'model'>> & LLMConfig): BaseChatModel {
  const openaiApiKey =
    process.env.SECRET_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    throw new Error(
      "Missing required environment variable: SECRET_OPENAI_API_KEY or OPENAI_API_KEY"
    );
  }

  return new ChatOpenAI({
    model: config.model,
    apiKey: openaiApiKey,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });
}
