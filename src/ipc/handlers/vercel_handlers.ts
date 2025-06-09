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

export async function getVercelProjectName(projectId: string): Promise<string | null> {
  const accessToken = await getVercelAccessToken();
  if (!accessToken) {
    logger.warn("Vercel Access Token not configured, cannot fetch project name.");
    return null;
  }
  try {
    const response = await fetch(`${VERCEL_API_BASE_URL}/v9/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      logger.error(`Failed to fetch Vercel project ${projectId}: ${response.statusText}`);
      return null;
    }
    const projectData: any = await response.json();
    return projectData.name || null;
  } catch (error) {
    logger.error(`Error fetching Vercel project name for ${projectId}:`, error);
    return null;
  }
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

  handle("vercel:create-project", async (_, { projectName }: { projectName: string }): Promise<VercelProject> => {
    logger.info(`IPC: vercel:create-project called for project name: ${projectName}`);
    const accessToken = await getVercelAccessToken();

    if (!accessToken) {
      throw new Error("Vercel Access Token not configured.");
    }
    if (!projectName || projectName.trim() === "") {
      throw new Error("Project name cannot be empty.");
    }

    try {
      const response = await fetch(`${VERCEL_API_BASE_URL}/v9/projects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          // Vercel might require other fields like 'framework' or git repository details
          // For now, we'll try creating a minimal project.
          // framework: "vite", // Example, might need to be more dynamic or let Vercel auto-detect
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        logger.error(`Vercel API error during project creation (${response.status}):`, errorBody);
        throw new Error(errorBody.error?.message || `Failed to create Vercel project: ${response.statusText}`);
      }

      const projectData: any = await response.json();
      const newProject: VercelProject = {
        id: projectData.id,
        name: projectData.name,
        url: `https://${projectData.targets?.production?.alias?.[0] || projectData.alias?.[0] || `${projectData.name}.vercel.app`}`,
      };
      logger.info(`Successfully created Vercel project: ${newProject.name} (ID: ${newProject.id})`);
      return newProject;
    } catch (error) {
      logger.error("Error creating Vercel project:", error);
      throw error;
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