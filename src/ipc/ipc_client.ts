import type { IpcRenderer } from "electron";
import { ChatSummariesSchema } from "../lib/schemas";
import { AppClient } from "./client/app_client";
import { ChatClient } from "./client/chat_client";
import { SettingsClient } from "./client/settings_client";
import { ExternalIntegrationsClient } from "./client/external_integrations_client";
import { SystemClient } from "./client/system_client";
import { LlmClient } from "./client/llm_client";

export class IpcClient {
  private static instance: IpcClient;
  private ipcRenderer: IpcRenderer;

  // Expose modular clients
  public app: AppClient;
  public chat: ChatClient;
  public settings: SettingsClient;
  public external: ExternalIntegrationsClient;
  public system: SystemClient;
  public llm: LlmClient;

  private constructor() {
    this.ipcRenderer = (window as any).electron.ipcRenderer as IpcRenderer;

    // Initialize modular clients
    this.app = new AppClient(this.ipcRenderer);
    this.chat = new ChatClient(this.ipcRenderer);
    this.settings = new SettingsClient(this.ipcRenderer);
    this.external = new ExternalIntegrationsClient(this.ipcRenderer);
    this.system = new SystemClient(this.ipcRenderer);
    this.llm = new LlmClient(this.ipcRenderer);
  }

  public static getInstance(): IpcClient {
    if (!IpcClient.instance) {
      IpcClient.instance = new IpcClient();
    }
    return IpcClient.instance;
  }
}