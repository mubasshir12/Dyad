import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { ProviderSettingsGrid } from "@/components/ProviderSettings";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { IpcClient } from "@/ipc/ipc_client";
import { showSuccess, showError } from "@/lib/toast";
import { AutoApproveSwitch } from "@/components/AutoApproveSwitch";
import { TelemetrySwitch } from "@/components/TelemetrySwitch";
import { MaxChatTurnsSelector } from "@/components/MaxChatTurnsSelector";
import { useSettings } from "@/hooks/useSettings";
import { useAppVersion } from "@/hooks/useAppVersion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Github, DatabaseZap, Rocket } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { INTEGRATION_PROVIDERS } from "@/shared/integrations";
import { providerSettingsRoute } from "@/routes/settings/providers/$provider";
import { vercelSettingsRoute } from "@/routes/settings/vercel";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const appVersion = useAppVersion();
  const { settings, updateSettings } = useSettings();
  const router = useRouter();

  const handleResetEverything = async () => {
    setIsResetting(true);
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.resetAll();
      showSuccess("Successfully reset everything. Restart the application.");
    } catch (error) {
      console.error("Error resetting:", error);
      showError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setIsResetting(false);
      setIsResetDialogOpen(false);
    }
  };

  const getIntegrationStatus = (integrationId: string) => {
    switch (integrationId) {
      case "github":
        return settings?.githubAccessToken ? "Ready" : "Needs Setup";
      case "supabase":
        return settings?.supabase?.accessToken ? "Ready" : "Needs Setup";
      case "vercel":
        return settings?.vercel?.accessToken ? "Ready" : "Needs Setup";
      default:
        return "Needs Setup";
    }
  };

  const getIntegrationIcon = (integrationId: string) => {
    switch (integrationId) {
      case "github":
        return <Github className="h-10 w-10 text-muted-foreground mb-2" />;
      case "supabase":
        return <DatabaseZap className="h-10 w-10 text-muted-foreground mb-2" />;
      case "vercel":
        return <Rocket className="h-10 w-10 text-muted-foreground mb-2" />;
      default:
        return null;
    }
  };

  const handleIntegrationClick = (integrationId: string) => {
    if (integrationId === "vercel") {
      router.navigate({ to: vercelSettingsRoute.id });
    } else if (integrationId === "github") {
      // GitHub doesn't have a dedicated settings page yet, it's handled in app-details
      // For now, we can just show a toast or navigate to a placeholder if needed.
      showError("GitHub integration is managed per-app in App Details.");
    } else if (integrationId === "supabase") {
      // Supabase integration is also managed per-app in App Details
      showError("Supabase integration is managed per-app in App Details.");
    }
  };

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-5xl mx-auto">
        <Button
          onClick={() => router.history.back()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        <div className="flex justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>

          {/* App Version Section */}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span className="mr-2 font-medium">App Version:</span>
            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono">
              {appVersion ? appVersion : "-"}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              General Settings
            </h2>

            <div className="space-y-4 mb-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Theme
                </label>

                <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
                  {(["system", "light", "dark"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setTheme(option)}
                      className={`
                        px-4 py-1.5 text-sm font-medium rounded-md
                        transition-all duration-200
                        ${
                          theme === option
                            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        }
                      `}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <AutoApproveSwitch showToast={false} />
              <div className="text-sm text-gray-500 dark:text-gray-400">
                This will automatically approve code changes and run them.
              </div>
            </div>

            <div className="mt-4">
              <MaxChatTurnsSelector />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <ProviderSettingsGrid />
          </div>

          {/* Deployment Integrations Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Deployment Integrations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {INTEGRATION_PROVIDERS.map((integration) => (
                <Card
                  key={integration.id}
                  className="relative transition-all hover:shadow-md border-border cursor-pointer"
                  onClick={() => handleIntegrationClick(integration.id)}
                >
                  <CardHeader className="p-4 flex flex-col items-center justify-center h-full">
                    {getIntegrationIcon(integration.id)}
                    <CardTitle className="text-xl text-center">
                      {integration.name}
                    </CardTitle>
                    <CardDescription className="text-center">
                      {integration.description}
                    </CardDescription>
                    <span className="mt-2 text-sm font-medium text-gray-500 bg-gray-50 dark:bg-gray-900 dark:text-gray-300 px-2 py-1 rounded-full">
                      {getIntegrationStatus(integration.id)}
                    </span>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Telemetry
              </h2>
              <div className="space-y-2">
                <TelemetrySwitch />
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  This records anonymous usage data to improve the product.
                </div>
              </div>

              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="mr-2 font-medium">Telemetry ID:</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono">
                  {settings ? settings.telemetryUserId : "n/a"}
                </span>
              </div>
            </div>
          </div>

          {/* Experiments Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Experiments
            </h2>
            <div className="space-y-4">
              {/* Enable File Editing Experiment */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="enable-file-editing"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Enable File Editing
                </label>
                <Switch
                  id="enable-file-editing"
                  checked={!!settings?.experiments?.enableFileEditing}
                  onCheckedChange={(checked) => {
                    updateSettings({
                      experiments: {
                        ...settings?.experiments,
                        enableFileEditing: checked,
                      },
                    });
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                File editing is not reliable and requires you to manually commit
                changes and update Supabase edge functions.
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-red-200 dark:border-red-800">
            <h2 className="text-lg font-medium text-red-600 dark:text-red-400 mb-4">
              Danger Zone
            </h2>

            <div className="space-y-4">
              <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Reset Everything
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will delete all your apps, chats, and settings. This
                    action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setIsResetDialogOpen(true)}
                  disabled={isResetting}
                  className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? "Resetting..." : "Reset Everything"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isResetDialogOpen}
        title="Reset Everything"
        message="Are you sure you want to reset everything? This will delete all your apps, chats, and settings. This action cannot be undone."
        confirmText="Reset Everything"
        cancelText="Cancel"
        onConfirm={handleResetEverything}
        onCancel={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
}