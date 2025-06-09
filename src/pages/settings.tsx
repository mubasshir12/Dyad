import { useState, useEffect }_from_ "react";
import { useTheme } _from_ "../contexts/ThemeContext";
import { ProviderSettingsGrid } _from_ "@/components/ProviderSettings";
import ConfirmationDialog _from_ "@/components/ConfirmationDialog";
import { IpcClient, GitHubDeviceFlowUpdateData, GitHubDeviceFlowErrorData, GitHubDeviceFlowSuccessData } _from_ "@/ipc/ipc_client";
import { showSuccess, showError } _from_ "@/lib/toast";
import { AutoApproveSwitch } _from_ "@/components/AutoApproveSwitch";
import { TelemetrySwitch } _from_ "@/components/TelemetrySwitch";
import { MaxChatTurnsSelector } _from_ "@/components/MaxChatTurnsSelector";
import { useSettings } _from_ "@/hooks/useSettings";
import { useAppVersion } _from_ "@/hooks/useAppVersion";
import { Button } _from_ "@/components/ui/button";
import { ArrowLeft, Github, DatabaseZap, Rocket, ExternalLink, Clipboard, Check, Loader2 } _from_ "lucide-react";
import { useRouter } _from_ "@tanstack/react-router";
import { Switch } _from_ "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} _from_ "@/components/ui/card";
import { INTEGRATION_PROVIDERS } _from_ "@/shared/integrations";
import { providerSettingsRoute } _from_ "@/routes/settings/providers/$provider";
import { vercelSettingsRoute } _from_ "@/routes/settings/vercel";
import { GitHubIntegration } _from_ "@/components/GitHubIntegration"; // Per il pulsante Disconnect
import { SupabaseIntegration } _from_ "@/components/SupabaseIntegration"; // Per il pulsante Disconnect

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const appVersion = useAppVersion();
  const { settings, updateSettings, refreshSettings } = useSettings();
  const router = useRouter();

  // State per il GitHub Device Flow
  const [githubUserCode, setGithubUserCode] = useState<string | null>(null);
  const [githubVerificationUri, setGithubVerificationUri] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [isConnectingToGithub, setIsConnectingToGithub] = useState(false);
  const [githubStatusMessage, setGithubStatusMessage] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showGithubAuthModal, setShowGithubAuthModal] = useState(false);


  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    if (isConnectingToGithub) {
      const removeUpdateListener =
        IpcClient.getInstance().onGithubDeviceFlowUpdate((data: GitHubDeviceFlowUpdateData) => {
          if (data.userCode) setGithubUserCode(data.userCode);
          if (data.verificationUri) setGithubVerificationUri(data.verificationUri);
          if (data.message) setGithubStatusMessage(data.message);
          setGithubError(null);
        });
      cleanupFunctions.push(removeUpdateListener);

      const removeSuccessListener =
        IpcClient.getInstance().onGithubDeviceFlowSuccess((data: GitHubDeviceFlowSuccessData) => {
          setGithubStatusMessage(data.message || "Successfully connected to GitHub!");
          setGithubUserCode(null);
          setGithubVerificationUri(null);
          setGithubError(null);
          setIsConnectingToGithub(false);
          setShowGithubAuthModal(false);
          refreshSettings();
        });
      cleanupFunctions.push(removeSuccessListener);

      const removeErrorListener = IpcClient.getInstance().onGithubDeviceFlowError(
        (data: GitHubDeviceFlowErrorData) => {
          setGithubError(data.error || "An unknown error occurred.");
          setGithubStatusMessage(null);
          setGithubUserCode(null);
          setGithubVerificationUri(null);
          setIsConnectingToGithub(false);
          // Non chiudere il modale in caso di errore, così l'utente vede il messaggio
        },
      );
      cleanupFunctions.push(removeErrorListener);
    }
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [isConnectingToGithub, refreshSettings]);


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
        return settings?.githubAccessToken ? "Connected" : "Not Connected";
      case "supabase":
        return settings?.supabase?.accessToken ? "Connected" : "Not Connected";
      case "vercel":
        return settings?.vercel?.accessToken ? "Connected" : "Not Connected";
      default:
        return "Not Connected";
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
      if (!settings?.githubAccessToken) {
        setIsConnectingToGithub(true);
        setGithubError(null);
        setGithubUserCode(null);
        setGithubVerificationUri(null);
        setGithubStatusMessage("Requesting device code from GitHub...");
        setShowGithubAuthModal(true);
        IpcClient.getInstance().startGithubDeviceFlow(null); // null appId per contesto globale
      } else {
        // Già connesso, potrebbe mostrare un messaggio o permettere la disconnessione qui
        // Per ora, la disconnessione è gestita dal componente GitHubIntegration
        showInfo("Already connected to GitHub. You can manage the connection below.");
      }
    } else if (integrationId === "supabase") {
      if (!settings?.supabase?.accessToken) {
        IpcClient.getInstance().openExternalUrl("https://supabase-oauth.dyad.sh/api/connect-supabase/login");
      } else {
        showInfo("Already connected to Supabase. You can manage the connection below.");
      }
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

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Integrations
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
            <div className="mt-6 space-y-4">
              <GitHubIntegration />
              <SupabaseIntegration />
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

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Experiments
            </h2>
            <div className="space-y-4">
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

      {/* GitHub Device Flow Modal */}
      <Dialog open={showGithubAuthModal} onOpenChange={(open) => {
        if (!open) {
          // Se l'utente chiude il modale, interrompiamo il tentativo di connessione
          setIsConnectingToGithub(false);
          setGithubUserCode(null);
          setGithubVerificationUri(null);
          setGithubError(null);
          setGithubStatusMessage(null);
        }
        setShowGithubAuthModal(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Github className="mr-2 h-5 w-5" /> Connect to GitHub
            </DialogTitle>
            <DialogDescription>
              Follow these steps to authorize Dyad with your GitHub account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {githubError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Error: {githubError}
              </p>
            )}
            {isConnectingToGithub && !githubUserCode && !githubError && (
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {githubStatusMessage || "Requesting authorization code..."}
              </div>
            )}
            {githubUserCode && githubVerificationUri && (
              <div className="space-y-2 text-sm">
                <p>
                  1. Open this URL in your browser:
                  <Button
                    variant="link"
                    className="p-0 h-auto ml-1 text-blue-600 dark:text-blue-400"
                    onClick={() => IpcClient.getInstance().openExternalUrl(githubVerificationUri)}
                  >
                    {githubVerificationUri} <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </p>
                <div>
                  2. Enter this code:
                  <div className="flex items-center gap-2 mt-1">
                    <strong className="font-mono text-lg tracking-wider bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md">
                      {githubUserCode}
                    </strong>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(githubUserCode).then(() => {
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        });
                      }}
                      title="Copy code"
                    >
                      {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {githubStatusMessage && !githubUserCode && (
              <p className="text-sm text-muted-foreground">{githubStatusMessage}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsConnectingToGithub(false); // Interrompi il tentativo
              setShowGithubAuthModal(false);
            }}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}