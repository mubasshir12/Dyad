import { readFileSync } from "fs";
import { join } from "path";
import log from "electron-log";
import { MCPManager } from "./MCPManager";
import { MCPServerConfig } from "./types";

const logger = log.scope("MCPServerManager");

export interface MCPServerManagerConfig {
  configPath?: string;
  autoStart?: boolean;
}

export class MCPServerManager {
  private mcpManager: MCPManager;
  private config: MCPServerManagerConfig;
  private serverConfigs: MCPServerConfig[] = [];

  constructor(config: MCPServerManagerConfig = {}) {
    this.config = {
      configPath: "./src/mcp/config/mcp-servers.json",
      autoStart: true,
      ...config,
    };

    this.mcpManager = new MCPManager({
      servers: [],
      autoConnect: false,
      retryOnDisconnect: true,
    });
  }

  async initialize(): Promise<void> {
    logger.info("Initialisiere MCP-Server-Manager...");

    await this.loadServerConfigs();

    if (this.config.autoStart) {
      await this.startEnabledServers();
    }

    logger.info("MCP-Server-Manager erfolgreich initialisiert");
  }

  async loadServerConfigs(): Promise<void> {
    try {
      const configPath = join(process.cwd(), this.config.configPath!);
      const configData = readFileSync(configPath, "utf-8");
      const config = JSON.parse(configData);

      this.serverConfigs = config.servers || [];
      logger.info(
        `${this.serverConfigs.length} Server-Konfigurationen geladen`,
      );
    } catch (error) {
      logger.error("Fehler beim Laden der Server-Konfiguration:", error);
      // Fallback zu Standard-Konfiguration
      this.serverConfigs = this.getDefaultServerConfigs();
    }
  }

  async startEnabledServers(): Promise<void> {
    const enabledServers = this.serverConfigs.filter(
      (server) => server.enabled,
    );

    for (const serverConfig of enabledServers) {
      try {
        await this.mcpManager.startServer(serverConfig);
        logger.info(`Server ${serverConfig.name} gestartet`);
      } catch (error) {
        logger.error(
          `Fehler beim Starten von Server ${serverConfig.name}:`,
          error,
        );
      }
    }
  }

  async stopAllServers(): Promise<void> {
    const runningServers = this.mcpManager.getServers();

    for (const serverName of runningServers) {
      try {
        await this.mcpManager.stopServer(serverName);
        logger.info(`Server ${serverName} gestoppt`);
      } catch (error) {
        logger.error(`Fehler beim Stoppen von Server ${serverName}:`, error);
      }
    }
  }

  getMCPManager(): MCPManager {
    return this.mcpManager;
  }

  getServerConfigs(): MCPServerConfig[] {
    return this.serverConfigs;
  }

  private getDefaultServerConfigs(): MCPServerConfig[] {
    return [
      {
        name: "filesystem",
        enabled: true,
        config: {
          type: "stdio",
          command: "npx",
          args: ["@modelcontextprotocol/server-filesystem"],
          env: {
            MCP_FILESYSTEM_ROOT: "./workspace",
          },
        },
      },
    ];
  }
}
