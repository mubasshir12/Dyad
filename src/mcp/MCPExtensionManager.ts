import log from "electron-log";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import { getUserDataPath } from "../paths/paths";

const logger = log.scope("mcp-extension-manager");

export interface MCPExtension {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  category?: string;
  enabled: boolean;
  installed: boolean;
  isOfficial?: boolean;
  config?: Record<string, any>;
  packageName?: string;
  type?: "STDIO" | "HTTP";
  command?: string;
  args?: string[];
  timeout?: number;
  env?: Record<string, string>;
}

export class MCPExtensionManager {
  private extensions: MCPExtension[] = [];
  private configPath: string;
  private saveLock: Promise<void> = Promise.resolve();

  constructor(configPath?: string) {
    this.configPath =
      configPath || path.join(getUserDataPath(), "mcp-extensions.json");
  }

  async initialize(): Promise<void> {
    logger.info("Initialisiere MCP Extension Manager...");
    await this.loadExtensions();
    logger.info("MCP Extension Manager successfully initialized");
  }

  private async loadExtensions(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf8");
        this.extensions = JSON.parse(data);
        logger.info(`${this.extensions.length} Extensions geladen`);
      } else {
        this.extensions = [];
        logger.info("No extensions file found, starting with empty list");
      }
    } catch (error) {
      logger.error("Error loading extensions:", error);
      this.extensions = [];
    }
  }

  async saveExtensions(): Promise<void> {
    this.saveLock = this.saveLock
      .catch(() => undefined)
      .then(async () => {
        try {
          const data = JSON.stringify(this.extensions, null, 2);
          const dir = path.dirname(this.configPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          await fsPromises.writeFile(this.configPath, data, "utf8");
          logger.info(`${this.extensions.length} Extensions saved`);
        } catch (error) {
          logger.error("Error saving extensions:", error);
          throw new Error(`Error saving extensions: ${error}`);
        }
      });

    return this.saveLock;
  }

  async getExtensions(): Promise<MCPExtension[]> {
    return this.extensions;
  }

  async addExtension(
    extension: Omit<MCPExtension, "id" | "installed">,
  ): Promise<MCPExtension> {
    const newExtension: MCPExtension = {
      ...extension,
      id: uuidv4(),
      installed: false,
    };

    this.extensions.push(newExtension);
    await this.saveExtensions();

    logger.info(`Extension ${newExtension.name} added`);
    return newExtension;
  }

  async updateExtension(
    extensionId: string,
    updates: Partial<MCPExtension>,
  ): Promise<MCPExtension> {
    const index = this.extensions.findIndex((ext) => ext.id === extensionId);
    if (index === -1) {
      throw new Error(`Extension with ID ${extensionId} not found`);
    }

    const { id: _, ...mutableUpdates } = updates;
    this.extensions[index] = { ...this.extensions[index], ...mutableUpdates };
    await this.saveExtensions();

    logger.info(`Extension ${this.extensions[index].name} updated`);
    return this.extensions[index];
  }

  async deleteExtension(extensionId: string): Promise<void> {
    const index = this.extensions.findIndex((ext) => ext.id === extensionId);
    if (index === -1) {
      throw new Error(`Extension with ID ${extensionId} not found`);
    }

    const extensionName = this.extensions[index].name;
    this.extensions.splice(index, 1);
    await this.saveExtensions();

    logger.info(`Extension ${extensionName} deleted`);
  }

  async toggleExtension(
    extensionId: string,
    enabled: boolean,
  ): Promise<MCPExtension> {
    return await this.updateExtension(extensionId, { enabled });
  }

  async installNpmPackage(
    packageName: string,
    config?: Partial<MCPExtension>,
  ): Promise<MCPExtension> {
    // Hier würde normalerweise die NPM-Installation erfolgen
    logger.info(`Install NPM package: ${packageName}`);

    const extension: MCPExtension = {
      id: uuidv4(),
      name: packageName,
      description: `NPM package: ${packageName}`,
      enabled: true,
      installed: true,
      packageName,
      ...config,
    };

    this.extensions.push(extension);
    await this.saveExtensions();

    return extension;
  }

  async searchExtensions(query: string): Promise<MCPExtension[]> {
    const lowercaseQuery = query.toLowerCase();
    return this.extensions.filter(
      (extension) =>
        extension.name.toLowerCase().includes(lowercaseQuery) ||
        extension.description.toLowerCase().includes(lowercaseQuery),
    );
  }

  getExtension(extensionId: string): MCPExtension | undefined {
    return this.extensions.find((ext) => ext.id === extensionId);
  }
}
