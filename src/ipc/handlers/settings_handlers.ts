import { BrowserWindow, ipcMain } from "electron";
import type { UserSettings } from "../../lib/schemas";
import { writeSettings } from "../../main/settings";
import { readSettings } from "../../main/settings";

export function registerSettingsHandlers() {
  // Intentionally do NOT use handle because it could log sensitive data from the return value.
  ipcMain.handle("get-user-settings", async () => {
    const settings = readSettings();
    return settings;
  });

  // Intentionally do NOT use handle because it could log sensitive data from the args.
  ipcMain.handle(
    "set-user-settings",
    async (_, settings: Partial<UserSettings>) => {
      writeSettings(settings);
      const updated = readSettings();

      if (typeof settings.enableTransparentWindow !== "undefined") {
        const focused = BrowserWindow.getFocusedWindow();
        if (focused) {
          try {
            const enable = !!settings.enableTransparentWindow;
            focused.setOpacity(enable ? 0.95 : 1);
          } catch {}
        }
      }

      return updated;
    },
  );
}
