import log from "electron-log";
import { MCPServerManager } from "../../mcp/MCPServerManager";
import { createLoggedHandler } from "./safe_handle";

const logger = log.scope("mcp-handlers");
const handle = createLoggedHandler(logger);

let mcpServerManager: MCPServerManager | null = null;

export function setMCPServerManager(manager: MCPServerManager) {
  mcpServerManager = manager;
  logger.info("MCP Server Manager gesetzt");
}

export function registerMCPHandlers() {
  handle("mcp:get-all-tools", async () => {
    if (!mcpServerManager) {
      throw new Error("MCP Server Manager nicht initialisiert");
    }
    return mcpServerManager.getAllTools();
  });

  handle("mcp:get-tools-for-extension", async (event, extensionId: string) => {
    if (!mcpServerManager) {
      throw new Error("MCP Server Manager nicht initialisiert");
    }
    return mcpServerManager.getToolsForExtension(extensionId);
  });

  handle(
    "mcp:execute-tool",
    async (
      event,
      {
        extensionId,
        toolName,
        arguments_,
      }: {
        extensionId: string;
        toolName: string;
        arguments_: any;
      },
    ) => {
      if (!mcpServerManager) {
        throw new Error("MCP Server Manager nicht initialisiert");
      }
      return await mcpServerManager.executeTool(
        extensionId,
        toolName,
        arguments_,
      );
    },
  );

  handle("mcp:connect-extension", async (event, extensionId: string) => {
    if (!mcpServerManager) {
      throw new Error("MCP Server Manager nicht initialisiert");
    }

    const extension = await getExtensionById(extensionId);
    if (!extension) {
      throw new Error(`Extension mit ID ${extensionId} nicht gefunden`);
    }

    await mcpServerManager.connectToExtension(extension);
    return { success: true };
  });

  handle("mcp:disconnect-extension", async (event, extensionId: string) => {
    if (!mcpServerManager) {
      throw new Error("MCP Server Manager nicht initialisiert");
    }

    await mcpServerManager.disconnectFromExtension(extensionId);
    return { success: true };
  });

  handle("mcp:is-extension-connected", async (event, extensionId: string) => {
    if (!mcpServerManager) {
      return false;
    }
    return mcpServerManager.isExtensionConnected(extensionId);
  });

  logger.info("MCP-Handler registriert");
}

async function getExtensionById(extensionId: string) {
  const { MCPExtensionManager } = await import("../../mcp/MCPExtensionManager");
  const extensionManager = new MCPExtensionManager();
  await extensionManager.initialize();
  return extensionManager.getExtension(extensionId);
}
