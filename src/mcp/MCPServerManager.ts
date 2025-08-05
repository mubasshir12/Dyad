import log from "electron-log";
import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { MCPExtension } from "./MCPExtensionManager";

const logger = log.scope("mcp-server-manager");

export interface MCPServerConfig {
  name: string;
  enabled: boolean;
  config: {
    type: string;
    command: string;
    args: string[];
    env: Record<string, string>;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  extensionId: string;
}

export interface MCPConnection {
  extensionId: string;
  process: ChildProcess;
  tools: MCPTool[];
  isConnected: boolean;
}

export class MCPServerManager extends EventEmitter {
  private connections: Map<string, MCPConnection> = new Map();
  private extensionManager: any;

  constructor(extensionManager: any) {
    super();
    this.extensionManager = extensionManager;
  }

  async initialize(): Promise<void> {
    logger.info("Initialisiere MCP Server Manager...");
    await this.connectToEnabledExtensions();
    logger.info("MCP Server Manager erfolgreich initialisiert");
  }

  private async connectToEnabledExtensions(): Promise<void> {
    const extensions = await this.extensionManager.getExtensions();
    const enabledExtensions = extensions.filter(
      (ext: MCPExtension) => ext.enabled,
    );

    for (const extension of enabledExtensions) {
      try {
        await this.connectToExtension(extension);
      } catch (error) {
        logger.error(
          `Fehler beim Verbinden zu Extension ${extension.name}:`,
          error,
        );
      }
    }
  }

  async connectToExtension(extension: MCPExtension): Promise<void> {
    if (this.connections.has(extension.id)) {
      logger.warn(
        `Verbindung zu Extension ${extension.name} bereits vorhanden`,
      );
      return;
    }

    if (!extension.command) {
      logger.warn(`Extension ${extension.name} hat keinen Befehl definiert`);
      return;
    }

    try {
      logger.info(`Verbinde zu MCP Server: ${extension.name}`);

      const envVars = { ...process.env, ...extension.env };
      const childProcess = spawn(extension.command, extension.args || [], {
        env: envVars,
        stdio: ["pipe", "pipe", "pipe"],
      });

      const connection: MCPConnection = {
        extensionId: extension.id,
        process: childProcess,
        tools: [],
        isConnected: false,
      };

      this.connections.set(extension.id, connection);

      childProcess.stdout?.on("data", (data: Buffer) => {
        this.handleServerMessage(extension.id, data.toString());
      });

      childProcess.stderr?.on("data", (data: Buffer) => {
        logger.warn(`MCP Server ${extension.name} stderr:`, data.toString());
      });

      childProcess.on("close", (code: number | null) => {
        logger.info(`MCP Server ${extension.name} beendet mit Code: ${code}`);
        this.connections.delete(extension.id);
        this.emit("serverDisconnected", extension.id);
      });

      childProcess.on("error", (error: Error) => {
        logger.error(`Fehler beim MCP Server ${extension.name}:`, error);
        this.connections.delete(extension.id);
        this.emit("serverError", extension.id, error);
      });

      await this.initializeServer(connection);
    } catch (error) {
      logger.error(
        `Fehler beim Starten des MCP Servers ${extension.name}:`,
        error,
      );
      throw error;
    }
  }

  private async initializeServer(connection: MCPConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Server initialization timeout"));
      }, 10000);

      const onMessage = (data: string) => {
        try {
          const message = JSON.parse(data);
          if (message.method === "initialize") {
            clearTimeout(timeout);
            connection.isConnected = true;
            this.discoverTools(connection);
            this.emit("serverConnected", connection.extensionId);
            resolve();
          }
        } catch (error) {
          logger.error("Fehler beim Parsen der Server-Nachricht:", error);
        }
      };

      connection.process.stdout?.on("data", (data: Buffer) => {
        onMessage(data.toString());
      });
    });
  }

  private async discoverTools(connection: MCPConnection): Promise<void> {
    try {
      const toolsRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      };

      connection.process.stdin?.write(JSON.stringify(toolsRequest) + "\n");

      // Tool discovery would be handled in handleServerMessage
      // For now, we'll add a placeholder tool
      connection.tools.push({
        name: "placeholder_tool",
        description: "Placeholder tool for testing",
        inputSchema: { type: "object", properties: {} },
        extensionId: connection.extensionId,
      });

      logger.info(`Tools für Extension ${connection.extensionId} entdeckt`);
    } catch (error) {
      logger.error("Fehler beim Tool-Discovery:", error);
    }
  }

  private handleServerMessage(extensionId: string, data: string): void {
    try {
      const message = JSON.parse(data);
      logger.debug(`MCP Server Nachricht von ${extensionId}:`, message);

      if (message.method === "tools/list") {
        this.handleToolsList(extensionId, message);
      }
    } catch (error) {
      logger.error("Fehler beim Verarbeiten der Server-Nachricht:", error);
    }
  }

  private handleToolsList(extensionId: string, message: any): void {
    const connection = this.connections.get(extensionId);
    if (!connection) return;

    if (message.result?.tools) {
      connection.tools = message.result.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        extensionId,
      }));

      logger.info(
        `${connection.tools.length} Tools von Extension ${extensionId} geladen`,
      );
      this.emit("toolsUpdated", extensionId, connection.tools);
    }
  }

  async disconnectFromExtension(extensionId: string): Promise<void> {
    const connection = this.connections.get(extensionId);
    if (!connection) return;

    logger.info(`Trenne Verbindung zu Extension ${extensionId}`);
    connection.process.kill();
    this.connections.delete(extensionId);
  }

  async executeTool(
    extensionId: string,
    toolName: string,
    arguments_: any,
  ): Promise<any> {
    const connection = this.connections.get(extensionId);
    if (!connection) {
      throw new Error(`Keine Verbindung zu Extension ${extensionId}`);
    }

    if (!connection.isConnected) {
      throw new Error(`Server ${extensionId} ist nicht verbunden`);
    }

    const tool = connection.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(
        `Tool ${toolName} nicht gefunden in Extension ${extensionId}`,
      );
    }

    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: arguments_,
      },
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Tool execution timeout"));
      }, 30000);

      const onMessage = (data: string) => {
        try {
          const message = JSON.parse(data);
          if (message.id === request.id) {
            clearTimeout(timeout);
            if (message.error) {
              reject(new Error(message.error.message));
            } else {
              resolve(message.result);
            }
          }
        } catch (error) {
          logger.error("Fehler beim Parsen der Tool-Antwort:", error);
        }
      };

      connection.process.stdout?.on("data", (data: Buffer) => {
        onMessage(data.toString());
      });

      connection.process.stdin?.write(JSON.stringify(request) + "\n");
    });
  }

  getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    for (const connection of this.connections.values()) {
      allTools.push(...connection.tools);
    }
    return allTools;
  }

  getToolsForExtension(extensionId: string): MCPTool[] {
    const connection = this.connections.get(extensionId);
    return connection ? connection.tools : [];
  }

  isExtensionConnected(extensionId: string): boolean {
    const connection = this.connections.get(extensionId);
    return connection ? connection.isConnected : false;
  }

  async shutdown(): Promise<void> {
    logger.info("Beende MCP Server Manager...");

    for (const [extensionId, _connection] of this.connections) {
      try {
        await this.disconnectFromExtension(extensionId);
      } catch (error) {
        logger.error(
          `Fehler beim Beenden der Verbindung zu ${extensionId}:`,
          error,
        );
      }
    }

    this.connections.clear();
    logger.info("MCP Server Manager beendet");
  }
}
