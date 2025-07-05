import * as path from "node:path";
import { Worker } from "node:worker_threads";

import { ProblemReport } from "../ipc_types";
import log from "electron-log";

const logger = log.scope("tsc");

interface WorkerInput {
  fullResponse: string;
  appPath: string;
}

interface WorkerOutput {
  success: boolean;
  data?: ProblemReport;
  error?: string;
}

export async function generateProblemReport({
  fullResponse,
  appPath,
}: {
  fullResponse: string;
  appPath: string;
}): Promise<ProblemReport> {
  return new Promise((resolve, reject) => {
    // Determine the worker script path
    const workerPath = path.join(
      __dirname,
      "../../../workers/dist/tsc-worker.js",
    );

    logger.info(`Starting TSC worker for app ${appPath}`);

    // Create the worker
    const worker = new Worker(workerPath);

    // Handle worker messages
    worker.on("message", (output: WorkerOutput) => {
      worker.terminate();

      if (output.success && output.data) {
        logger.info(`TSC worker completed successfully for app ${appPath}`);
        resolve(output.data);
      } else {
        logger.error(`TSC worker failed for app ${appPath}: ${output.error}`);
        reject(new Error(output.error || "Unknown worker error"));
      }
    });

    // Handle worker errors
    worker.on("error", (error) => {
      logger.error(`TSC worker error for app ${appPath}:`, error);
      worker.terminate();
      reject(error);
    });

    // Handle worker exit
    worker.on("exit", (code) => {
      if (code !== 0) {
        logger.error(`TSC worker exited with code ${code} for app ${appPath}`);
        reject(new Error(`Worker exited with code ${code}`));
      }
    });

    // Send input to worker
    const input: WorkerInput = {
      fullResponse,
      appPath,
    };

    worker.postMessage(input);
  });
}
