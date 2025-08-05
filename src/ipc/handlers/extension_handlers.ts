import { ipcMain } from "electron";
import log from "electron-log";
import {
  MCPExtensionManager,
  MCPExtension,
} from "../../mcp/MCPExtensionManager";

const logger = log.scope("extension-handlers");

let extensionManager: MCPExtensionManager | null = null;

export function setExtensionManager(manager: MCPExtensionManager) {
  extensionManager = manager;
}

export function registerExtensionHandlers() {
  ipcMain.handle("list-extensions", async () => {
    if (!extensionManager) {
      throw new Error("Extension Manager nicht initialisiert");
    }
    return await extensionManager.getExtensions();
  });

  ipcMain.handle(
    "add-extension",
    async (event, extension: Omit<MCPExtension, "id" | "installed">) => {
      if (!extensionManager) {
        throw new Error("Extension Manager nicht initialisiert");
      }
      return await extensionManager.addExtension(extension);
    },
  );

  ipcMain.handle(
    "update-extension",
    async (
      event,
      {
        extensionId,
        updates,
      }: { extensionId: string; updates: Partial<MCPExtension> },
    ) => {
      if (!extensionManager) {
        throw new Error("Extension Manager nicht initialisiert");
      }
      return await extensionManager.updateExtension(extensionId, updates);
    },
  );

  ipcMain.handle("delete-extension", async (event, extensionId: string) => {
    if (!extensionManager) {
      throw new Error("Extension Manager nicht initialisiert");
    }
    await extensionManager.deleteExtension(extensionId);
  });

  ipcMain.handle(
    "toggle-extension",
    async (
      event,
      { extensionId, enabled }: { extensionId: string; enabled: boolean },
    ) => {
      if (!extensionManager) {
        throw new Error("Extension Manager nicht initialisiert");
      }
      return await extensionManager.toggleExtension(extensionId, enabled);
    },
  );

  ipcMain.handle(
    "install-npm-package",
    async (
      event,
      {
        packageName,
        config,
      }: { packageName: string; config?: Partial<MCPExtension> },
    ) => {
      if (!extensionManager) {
        throw new Error("Extension Manager nicht initialisiert");
      }
      return await extensionManager.installNpmPackage(packageName, config);
    },
  );

  ipcMain.handle("search-extensions", async (event, query: string) => {
    if (!extensionManager) {
      throw new Error("Extension Manager nicht initialisiert");
    }
    return await extensionManager.searchExtensions(query);
  });

  logger.info("Extension-Handler registriert");
}
