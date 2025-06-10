import { ContextPath, ContextPathsSchema } from "@/lib/schemas";
import log from "electron-log";

const logger = log.scope("context_paths_utils");

export function validateContextPaths(contextPaths: unknown): ContextPath[] {
  if (!contextPaths) {
    return [];
  }

  try {
    // Validate that the contextPaths data matches the expected schema
    return ContextPathsSchema.parse(contextPaths);
  } catch (error) {
    logger.warn("Invalid contextPaths data:", error);
    // Return empty array as fallback if validation fails
    return [];
  }
}
