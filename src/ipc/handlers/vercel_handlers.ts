import { ipcMain } from "electron";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { VercelProject, VercelDeployParams } from "../ipc_types";

const logger = log.scope("vercel_handlers");
const handle = createLoggedHandler(logger);

export function registerVercelHandlers() {
  handle("vercel:list-projects", async (): Promise<VercelProject[]> => {
    logger.info("IPC: vercel:list-projects called (placeholder)");
    // Placeholder for actual Vercel API call
    return [
      { id: "proj_123", name: "My First Vercel Project", url: "https://my-first-vercel-project.vercel.app" },
      { id: "proj_456", name: "Another App", url: "https://another-app.vercel.app" },
    ];
  });

  handle("vercel:deploy-project", async (_, params: VercelDeployParams): Promise<void> => {
    logger.info("IPC: vercel:deploy-project called (placeholder)", params);
    // Placeholder for actual Vercel deployment logic
    console.log(`Deploying app ${params.appId} to Vercel project ${params.projectId}`);
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    logger.info("Deployment simulated successfully.");
  });

  logger.debug("Registered Vercel IPC handlers");
}