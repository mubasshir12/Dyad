import { LargeLanguageModel } from "@/lib/schemas";
import { readSettings } from "../../main/settings";
import { Message } from "../ipc_types";

import { findLanguageModel } from "./findLanguageModel";

// Estimate tokens (4 characters per token)
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

export const estimateMessagesTokens = (messages: Message[]): number => {
  return messages.reduce(
    (acc, message) => acc + estimateTokens(message.content),
    0,
  );
};

const DEFAULT_CONTEXT_WINDOW = 128_000;

export async function getContextWindow() {
  const settings = readSettings();
  const modelOption = await findLanguageModel(settings.selectedModel);
  return modelOption?.contextWindow || DEFAULT_CONTEXT_WINDOW;
}

// Most models support at least 8000 output tokens so we use it as a default value.
const DEFAULT_MAX_TOKENS = 8_000;

export async function getMaxTokens(model: LargeLanguageModel) {
  const modelOption = await findLanguageModel(model);
  return modelOption?.maxOutputTokens || DEFAULT_MAX_TOKENS;
}

/**
 * Determines if we should use `max_completion_tokens` instead of `max_tokens` for the given model.
 * Currently applies to OpenAI o-series (o1/o3/o4) and GPT-5 family models.
 */
export function requiresMaxCompletionTokens(
  model: LargeLanguageModel,
): boolean {
  if (model.provider !== "openai") return false;
  const name = model.name.toLowerCase();
  return (
    name.startsWith("o1") ||
    name.startsWith("o3") ||
    name.startsWith("o4") ||
    name.startsWith("gpt-5")
  );
}

/**
 * Determines if the model requires using the default temperature (1) and does not accept explicit values.
 * Applies to OpenAI GPT-5 and o-series.
 */
export function requiresDefaultTemperature(model: LargeLanguageModel): boolean {
  if (model.provider !== "openai") return false;
  const name = model.name.toLowerCase();
  return (
    name.startsWith("gpt-5") ||
    name.startsWith("o1") ||
    name.startsWith("o3") ||
    name.startsWith("o4")
  );
}
