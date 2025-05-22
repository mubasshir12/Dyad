import { app, BrowserWindow, dialog } from "electron";
import * as path from "node:path";
import { registerIpcHandlers } from "./ipc/ipc_host";
import dotenv from "dotenv";
// @ts-ignore
import started from "electron-squirrel-startup";
import { updateElectronApp } from "update-electron-app";
import log from "electron-log";
import { readSettings, writeSettings } from "./main/settings";
import { handleSupabaseOAuthReturn } from "./supabase_admin/supabase_return_handler";
import { handleDyadProReturn } from "./main/pro";
import fastify, { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { users, buildRequests, chatMessages } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateAndHostWebsite } from '../core/website_generator';
import localtunnel from 'localtunnel'; // Added localtunnel import

log.errorHandler.startCatching();
log.eventLogger.startLogging();
log.scope.labelPadding = false;

const logger = log.scope("main");

updateElectronApp(); // additional configuration options available

// Load environment variables from .env file
dotenv.config();

// Register IPC handlers before app is ready
registerIpcHandlers();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app#main-process-mainjs
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("dyad", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("dyad");
}

export async function onReady() {
  await onFirstRunMaybe();

  // Initialize Fastify server
  const server: FastifyInstance = fastify();

  // Register a health check route
  server.get('/health', async (request, reply) => {
    return { status: 'ok' };
  });

  // Define interfaces for the new endpoint
  interface BuildWebsiteRequestBody {
    userId: string;
    requirement: string;
  }

  interface BuildWebsiteResponseBody {
    buildId: string;
    status: string;
    websiteUrl?: string;
    message?: string;
  }

  // Register the POST /build-website route
  server.post<{ Body: BuildWebsiteRequestBody }, {}, BuildWebsiteResponseBody>('/build-website', async (request, reply) => {
    const { userId, requirement } = request.body;

    if (!userId || !requirement) {
      reply.status(400).send({
        buildId: '',
        status: 'error',
        message: 'Missing userId or requirement in request body'
      });
      return;
    }

    const buildId = uuidv4();
    const buildLogger = logger.scope('build-website'); 

    buildLogger.info(`Received build request: buildId=${buildId}, userId=${userId}`); // Requirement already logged by default Fastify logging if schema is used for validation

    try {
      // Upsert user: Insert if not exists
      buildLogger.info(`Ensuring user exists: userId=${userId}`);
      await db.insert(users)
        .values({ id: userId })
        .onConflictDoNothing() // Assumes 'id' is the primary key or has a unique constraint for conflict to occur
        .execute();

      // Insert build request
      buildLogger.info(`Inserting build request: buildId=${buildId}`);
      await db.insert(buildRequests).values({
        id: buildId,
        userId: userId, // userId can be null if schema allows, ensure it's handled
        requirement: requirement,
        status: 'pending',
        // websiteUrl is nullable and defaults to null in DB if not provided
        // createdAt and updatedAt have default SQL values in the schema
      }).execute();

      // Placeholder for triggering build process (Step 6 of main plan) - This log remains as per instructions
      // buildLogger.info(`Placeholder: Build process for buildId=${buildId} would be triggered here.`);
      // e.g., triggerBuild(buildId, requirement);

      // Send 202 Accepted response immediately
      reply.status(202).send({
        buildId,
        status: 'pending',
        message: 'Build request received and is pending.',
      });

      // Run generation in the background
      (async () => {
        buildLogger.info(`Starting background website generation for buildId: ${buildId}`);
        try {
          // Update status to 'in-progress'
          await db.update(buildRequests)
            .set({ status: 'in-progress', updatedAt: new Date() })
            .where(eq(buildRequests.id, buildId));
          
          const result = await generateAndHostWebsite(buildId, userId, requirement);

          if (result.error) {
            buildLogger.error(`Website generation failed for buildId ${buildId}: ${result.error}`);
            await db.update(buildRequests)
              .set({ 
                status: 'error', 
                buildError: result.error, 
                devServerPid: result.devServerPid, // Store PID even on error if available
                updatedAt: new Date() 
              })
              .where(eq(buildRequests.id, buildId));
          } else {
            buildLogger.info(`Website generation successful for buildId ${buildId}. Local URL: ${result.localUrl}, PID: ${result.devServerPid}`);
            
            // Attempt to create a public tunnel for the generated website
            if (result.localUrl) {
              try {
                const localUrlParts = new URL(result.localUrl);
                const sitePort = parseInt(localUrlParts.port, 10);

                if (isNaN(sitePort)) {
                  throw new Error(`Could not parse port from localUrl: ${result.localUrl}`);
                }

                const siteTunnel = await localtunnel({ port: sitePort });
                buildLogger.info(`Public website URL for buildId ${buildId}: ${siteTunnel.url} (tunnels ${result.localUrl})`);

                await db.update(buildRequests)
                  .set({
                    status: 'completed',
                    websiteUrl: siteTunnel.url, // Store public URL
                    devServerPid: result.devServerPid,
                    updatedAt: new Date()
                  })
                  .where(eq(buildRequests.id, buildId));

                siteTunnel.on('close', () => {
                  buildLogger.info(`Tunnel for buildId ${buildId} (URL: ${siteTunnel.url}) closed.`);
                  // Optionally, update DB to reflect tunnel is closed.
                });
                siteTunnel.on('error', (err) => {
                  buildLogger.error(`Tunnel error for buildId ${buildId} (URL: ${siteTunnel.url}):`, err);
                });

              } catch (tunnelError: any) {
                buildLogger.error(`Failed to create tunnel for buildId ${buildId} (localUrl: ${result.localUrl}):`, tunnelError);
                await db.update(buildRequests)
                  .set({
                    status: 'completed', 
                    websiteUrl: result.localUrl, // Fallback to local URL
                    devServerPid: result.devServerPid,
                    buildError: (result.error ? result.error + "; " : "") + `Tunnel creation failed: ${tunnelError.message}. Site available locally.`,
                    updatedAt: new Date()
                  })
                  .where(eq(buildRequests.id, buildId));
              }
            } else {
              // Fallback if localUrl is somehow not available despite success
              buildLogger.warn(`Build ${buildId} completed but no localUrl was provided for tunneling.`);
              await db.update(buildRequests)
                .set({ 
                  status: 'completed', // Still completed, but no URL
                  devServerPid: result.devServerPid,
                  buildError: (result.error ? result.error + "; " : "") + 'Completed but no local URL found for tunneling.',
                  updatedAt: new Date() 
                })
                .where(eq(buildRequests.id, buildId));
            }
          }
        } catch (genError: any) {
          buildLogger.error(`Unhandled exception during website generation for buildId ${buildId}:`, genError);
          try {
            await db.update(buildRequests)
              .set({ status: 'error', buildError: genError.message || String(genError), updatedAt: new Date() })
              .where(eq(buildRequests.id, buildId));
          } catch (dbError) {
            buildLogger.error(`Failed to even update build request to error status for buildId ${buildId}:`, dbError);
          }
        }
      })(); // Self-invoking async function for background processing

    } catch (error) { // This catch is for the initial DB operations (user upsert, initial buildRequest insert)
      buildLogger.error(`Error in initial processing of /build-website for buildId=${buildId}:`, error);
      // If the initial response hasn't been sent, send an error.
      // However, the current structure sends 202 before this background task.
      // If the error is before the 202, the original catch block handles it.
      // This specific catch block might be redundant if the self-invoking function is the main error source.
      // For clarity, the original catch handles errors before reply.status(202).send.
      // The self-invoking function has its own comprehensive error handling.
      // If the outer try-catch is to handle errors for code *before* reply.send, it's fine.
      // Let's assume the original snippet's structure where reply.send is inside the try.
      // The provided snippet has reply.send() *before* the async block.
      // So, this outer catch will handle errors from user upsert and initial build request insert.
      reply.status(500).send({
        buildId: buildId, // buildId might not be defined if error is early
        status: 'error',
        message: 'Failed to process build request due to a server error (initial setup).',
      });
    }
  });

  // Define interfaces for the GET /chat/:userId endpoint
  interface ChatRequestParams {
    userId: string;
  }

  // Updated UserActivityResponseBody as per the illustrative snippet
  interface UserActivityResponseBody {
    userId: string;
    builds: typeof buildRequests.$inferSelect[]; 
    messages: typeof chatMessages.$inferSelect[];
    // Optional: include a message field for errors or general info
    // errorMessage?: string; 
  }

  // Register the GET /chat/:userId route
  server.get<{ Params: ChatRequestParams }, {}, UserActivityResponseBody>('/chat/:userId', async (request, reply) => {
    const { userId } = request.params;
    const chatLogger = logger.scope('chat-history'); 
    chatLogger.info(`Received request for user activity for userId=${userId}`);

    try {
      const userBuilds = await db.select()
        .from(buildRequests)
        .where(eq(buildRequests.userId, userId))
        .orderBy(desc(buildRequests.createdAt))
        .execute();

      const userMessages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(desc(chatMessages.timestamp))
        .execute();
      
      // Timestamps from schema (mode: 'timestamp') are Date objects in Drizzle.
      // No explicit conversion needed here unless client requires specific string format.

      reply.status(200).send({
        userId,
        builds: userBuilds,
        messages: userMessages,
      });

    } catch (error) {
      chatLogger.error(`Error fetching user activity for userId=${userId}:`, error);
      // Sending a response that matches UserActivityResponseBody structure for consistency
      reply.status(500).send({
        userId,
        builds: [],
        messages: [],
        // errorMessage: 'Failed to retrieve user activity due to a server error.' 
      } as UserActivityResponseBody); // Cast to ensure type compatibility, useful if errorMessage is added
    }
  });

  // Define interfaces for the GET /build-status/:buildId endpoint
  interface BuildStatusRequestParams {
    buildId: string;
  }

  interface BuildStatusResponseBody {
    buildId: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    websiteUrl?: string;
    message?: string;
  }

  // Register the GET /build-status/:buildId route
  server.get<{ Params: BuildStatusRequestParams }, {}, BuildStatusResponseBody>('/build-status/:buildId', async (request, reply) => {
    const { buildId } = request.params;
    const statusLogger = logger.scope('build-status'); // Use existing logger, create a sub-scope
    statusLogger.info(`Received request for build status for buildId=${buildId}`);

    try {
      const buildRecord = await db.select()
        .from(buildRequests)
        .where(eq(buildRequests.id, buildId))
        .get(); // .get() returns the first row or undefined

      if (buildRecord) {
        // The status from DB (buildRecord.status) is already typed correctly due to the schema
        // but casting can be a safeguard if there were any doubts or transformations.
        // The schema defines status as text('status', { enum: ['pending', ..., 'error'] })
        reply.status(200).send({
          buildId: buildRecord.id,
          status: buildRecord.status as 'pending' | 'in-progress' | 'completed' | 'error',
          websiteUrl: buildRecord.websiteUrl ?? undefined, // Ensure undefined if null
          message: `Status for build ${buildId} retrieved successfully.` 
        });
      } else {
        reply.status(404).send({
          buildId,
          status: 'error', // Consistent with the BuildStatusResponseBody interface
          message: `Build with ID ${buildId} not found.`
        });
      }

    } catch (error) {
      statusLogger.error(`Error fetching build status for buildId=${buildId}:`, error);
      reply.status(500).send({
        buildId,
        status: 'error',
        message: 'Failed to retrieve build status due to a server error.'
      });
    }
  });

  // Start the server
  try {
    const API_PORT = 4004; // Corrected Main API server port
    await server.listen({ port: API_PORT, host: '0.0.0.0' });
    logger.info(`Fastify server listening on 0.0.0.0:${API_PORT}`);

    // Setup localtunnel for the main API server
    try {
      const apiTunnel = await localtunnel({ port: API_PORT });
      logger.info(`Public API available at: ${apiTunnel.url}`);

      apiTunnel.on('close', () => {
        logger.info('Public API tunnel closed.');
      });
      apiTunnel.on('error', (err) => {
        logger.error('Public API tunnel error:', err);
      });
    } catch (tunnelErr) {
      logger.error('Failed to create public API tunnel:', tunnelErr);
    }

  } catch (err) {
    logger.error('Error starting Fastify server:', err);
    // Depending on the application's needs, you might want to:
    // - Quit the app: app.quit();
    // - Show an error dialog to the user
    // For now, we'll just log the error.
  }
}

app.whenReady().then(onReady);

/**
 * Is this the first run of Fiddle? If so, perform
 * tasks that we only want to do in this case.
 */
export async function onFirstRunMaybe() {
  const settings = readSettings();
  if (!settings.hasRunBefore) {
    await promptMoveToApplicationsFolder();
    writeSettings({
      hasRunBefore: true,
    });
  }
}

/**
 * Ask the user if the app should be moved to the
 * applications folder.
 */
async function promptMoveToApplicationsFolder(): Promise<void> {
  if (process.platform !== "darwin") return;
  if (app.isInApplicationsFolder()) return;
  logger.log("Prompting user to move to applications folder");

  const { response } = await dialog.showMessageBox({
    type: "question",
    buttons: ["Move to Applications Folder", "Do Not Move"],
    defaultId: 0,
    message: "Move to Applications Folder? (required for auto-update)",
  });

  if (response === 0) {
    logger.log("User chose to move to applications folder");
    app.moveToApplicationsFolder();
  } else {
    logger.log("User chose not to move to applications folder");
  }
}

declare global {
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: process.env.NODE_ENV === "development" ? 1280 : 960,
    height: 700,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    trafficLightPosition: {
      x: 10,
      y: 8,
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      // transparent: true,
    },
    // backgroundColor: "#00000001",
    // frame: false,
  });
  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../renderer/main_window/index.html"),
    );
  }
  if (process.env.NODE_ENV === "development") {
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  }
};

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // the commandLine is array of strings in which last element is deep link url
    handleDeepLinkReturn(commandLine.pop()!);
  });

  // Create mainWindow, load the rest of the app, etc...
  app.whenReady().then(() => {
    createWindow();
  });
}

// Handle the protocol. In this case, we choose to show an Error Box.
app.on("open-url", (event, url) => {
  handleDeepLinkReturn(url);
});

function handleDeepLinkReturn(url: string) {
  // example url: "dyad://supabase-oauth-return?token=a&refreshToken=b"
  const parsed = new URL(url);
  // Intentionally do NOT log the full URL which may contain sensitive tokens.
  log.log(
    "Handling deep link: protocol",
    parsed.protocol,
    "hostname",
    parsed.hostname,
  );
  if (parsed.protocol !== "dyad:") {
    dialog.showErrorBox(
      "Invalid Protocol",
      `Expected dyad://, got ${parsed.protocol}. Full URL: ${url}`,
    );
    return;
  }
  if (parsed.hostname === "supabase-oauth-return") {
    const token = parsed.searchParams.get("token");
    const refreshToken = parsed.searchParams.get("refreshToken");
    const expiresIn = Number(parsed.searchParams.get("expiresIn"));
    if (!token || !refreshToken || !expiresIn) {
      dialog.showErrorBox(
        "Invalid URL",
        "Expected token, refreshToken, and expiresIn",
      );
      return;
    }
    handleSupabaseOAuthReturn({ token, refreshToken, expiresIn });
    // Send message to renderer to trigger re-render
    mainWindow?.webContents.send("deep-link-received", {
      type: parsed.hostname,
      url,
    });
    return;
  }
  // dyad://dyad-pro-return?key=123&budget_reset_at=2025-05-26T16:31:13.492000Z&max_budget=100
  if (parsed.hostname === "dyad-pro-return") {
    const apiKey = parsed.searchParams.get("key");
    if (!apiKey) {
      dialog.showErrorBox("Invalid URL", "Expected key");
      return;
    }
    handleDyadProReturn({
      apiKey,
    });
    // Send message to renderer to trigger re-render
    mainWindow?.webContents.send("deep-link-received", {
      type: parsed.hostname,
      url,
    });
    return;
  }
  dialog.showErrorBox("Invalid deep link URL", url);
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
