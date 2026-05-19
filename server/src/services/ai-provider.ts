import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { config } from "../config";

export type ProviderName = "openai" | "anthropic" | "gemini";

export interface ProviderConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
}

export function resolveModel(cfg: ProviderConfig): LanguageModel {
  switch (cfg.provider) {
    case "openai":
      return createOpenAI({ apiKey: cfg.apiKey })(cfg.model);
    case "anthropic":
      return createAnthropic({ apiKey: cfg.apiKey })(cfg.model);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey: cfg.apiKey })(cfg.model);
    default:
      throw new Error(`Unknown provider: ${(cfg as ProviderConfig).provider}`);
  }
}

export function serverFallbackConfig(): ProviderConfig | null {
  if (!config.gemini_api_key) return null;
  return {
    provider: "gemini",
    model: "gemini-2.5-flash",
    apiKey: config.gemini_api_key,
  };
}

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.5-flash",
};
