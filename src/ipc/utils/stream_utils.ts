import { streamText } from "ai";
import log from "electron-log";

const logger = log.scope("stream_utils");

/**
 * Streams text from a model with backup models in case of failure
 * @param options The options for streamText
 * @param backupModels Array of backup model clients to try if the primary model fails
 * @returns The result of streamText with the first successful model
 */
export async function streamTextWithBackup({
  options,
  backupModels = [],
}: {
  options: Parameters<typeof streamText>[0];
  backupModels: any[];
}) {
  // Try the primary model first
  try {
    logger.log(`Attempting to stream with primary model`);
    return streamText(options);
  } catch (error) {
    logger.error(`Error with primary model: ${error}`);

    // Original onError handler should still run for the primary model
    if (options.onError) {
      options.onError({ error });
    }

    // If we have backup models, try them in sequence
    for (let i = 0; i < backupModels.length; i++) {
      const backupModel = backupModels[i];
      logger.log(`Attempting to stream with backup model #${i + 1}`);

      try {
        // Create new options with the backup model
        const backupOptions = {
          ...options,
          model: backupModel,
          onError: (backupError: unknown) => {
            logger.error(`Error with backup model #${i + 1}: ${backupError}`);
            if (options.onError) {
              options.onError({ error: backupError });
            }
          },
        };

        return streamText(backupOptions);
      } catch (backupError) {
        logger.error(`Failed with backup model #${i + 1}: ${backupError}`);
        // Continue to next backup model
      }
    }

    // If all models failed, throw the original error
    throw error;
  }
}
