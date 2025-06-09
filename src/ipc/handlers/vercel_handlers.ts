import { ipcMain } from "electron";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { VercelProject, VercelDeployParams } from "../ipc_types";
import { readSettings } from "@/main/settings";
import fetch from "node-fetch"; // Import node-fetch

const logger = log.scope("vercel_handlers");
const handle = createLoggedHandler(logger);

const VERCEL_API_BASE_URL = "https://api.vercel.com";

async function getVercelAccessToken(): Promise<string | undefined> {
  const settings = readSettings();
  // Prioritize token from settings, then environment variable
  return settings.vercel?.accessToken?.value || process.env.VERCEL_ACCESS_TOKEN;
}

export function registerVercelHandlers() {
  handle("vercel:list-projects", async (): Promise<VercelProject[]> => {
    logger.info("IPC: vercel:list-projects called");
    const accessToken = await getVercelAccessToken();

    if (!accessToken) {
      throw new Error("Vercel Access Token not configured.");
    }

    try {
      const response = await fetch(`${VERCEL_API_BASE_URL}/v9/projects`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`Vercel API error (${response.status}): ${errorBody}`);
        throw new Error(`Failed to fetch Vercel projects: ${response.statusText} - ${errorBody}`);
      }

      const data: any = await response.json();
      const projects: VercelProject[] = data.projects.map((project: any) => ({
        id: project.id,
        name: project.name,
        url: `https://${project.targets?.production?.alias?.[0] || project.alias?.[0] || `${project.name}.vercel.app`}`, // Attempt to get a production URL
      }));
      logger.info(`Successfully fetched ${projects.length} Vercel projects.`);
      return projects;
    } catch (error) {
      logger.error("Error fetching Vercel projects:", error);
      throw error; // Re-throw to be caught by the client
    }
  });

  handle("vercel:deploy-project", async (_, params: VercelDeployParams): Promise<void> => {
    logger.info("IPC: vercel:deploy-project called (placeholder)", params);
    // Placeholder for actual Vercel deployment logic
    // This will require more complex interactions with Vercel's API or CLI
    // For now, we'll keep the placeholder behavior
    console.log(`Deploying app ${params.appId} to Vercel project ${params.projectId}`);
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    logger.info("Deployment simulated successfully.");
  });

  logger.debug("Registered Vercel IPC handlers");
}