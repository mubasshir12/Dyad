import log from "electron-log";
import { v4 as uuidv4 } from "uuid";

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

  constructor(configPath?: string) {
    this.configPath = configPath || "./mcp-extensions.json";
    this.loadExtensions();
  }

  async initialize(): Promise<void> {
    logger.info("Initialisiere MCP Extension Manager...");
    await this.loadExtensions();
    logger.info("MCP Extension Manager erfolgreich initialisiert");
  }

  private async loadExtensions(): Promise<void> {
    try {
      // Hier würde normalerweise das Laden aus einer Datei oder Datenbank erfolgen
      // Für jetzt verwenden wir eine leere Liste
      this.extensions = [];
      logger.info("Extensions geladen");
    } catch (error) {
      logger.error("Fehler beim Laden der Extensions:", error);
      this.extensions = [];
    }
  }

  private async saveExtensions(): Promise<void> {
    try {
      // Hier würde normalerweise das Speichern in eine Datei oder Datenbank erfolgen
      logger.info("Extensions gespeichert");
    } catch (error) {
      logger.error("Fehler beim Speichern der Extensions:", error);
    }
  }

  async getExtensions(): Promise<MCPExtension[]> {
    return this.extensions;
  }

  async addExtension(extension: Omit<MCPExtension, "id" | "installed">): Promise<MCPExtension> {
    const newExtension: MCPExtension = {
      ...extension,
      id: uuidv4(),
      installed: false,
    };

    this.extensions.push(newExtension);
    await this.saveExtensions();
    
    logger.info(`Extension ${newExtension.name} hinzugefügt`);
    return newExtension;
  }

  async updateExtension(extensionId: string, updates: Partial<MCPExtension>): Promise<MCPExtension> {
    const index = this.extensions.findIndex(ext => ext.id === extensionId);
    if (index === -1) {
      throw new Error(`Extension mit ID ${extensionId} nicht gefunden`);
    }

    this.extensions[index] = { ...this.extensions[index], ...updates };
    await this.saveExtensions();
    
    logger.info(`Extension ${this.extensions[index].name} aktualisiert`);
    return this.extensions[index];
  }

  async deleteExtension(extensionId: string): Promise<void> {
    const index = this.extensions.findIndex(ext => ext.id === extensionId);
    if (index === -1) {
      throw new Error(`Extension mit ID ${extensionId} nicht gefunden`);
    }

    const extensionName = this.extensions[index].name;
    this.extensions.splice(index, 1);
    await this.saveExtensions();
    
    logger.info(`Extension ${extensionName} gelöscht`);
  }

  async toggleExtension(extensionId: string, enabled: boolean): Promise<MCPExtension> {
    return await this.updateExtension(extensionId, { enabled });
  }

  async installNpmPackage(packageName: string, config?: Partial<MCPExtension>): Promise<MCPExtension> {
    // Hier würde normalerweise die NPM-Installation erfolgen
    logger.info(`Installiere NPM-Paket: ${packageName}`);
    
    const extension: MCPExtension = {
      id: uuidv4(),
      name: packageName,
      description: `NPM-Paket: ${packageName}`,
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
    return this.extensions.filter(extension =>
      extension.name.toLowerCase().includes(lowercaseQuery) ||
      extension.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  getExtension(extensionId: string): MCPExtension | undefined {
    return this.extensions.find(ext => ext.id === extensionId);
  }
} 