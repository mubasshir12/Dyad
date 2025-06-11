import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";

// Mock data for now
const availableUpgrades = [
  {
    id: "component-tagger",
    title: "Enable select component to edit",
    description: "Installs the Dyad component tagger Vite plugin.",
    manualUpgradeUrl: "https://dyad.sh/docs/upgrades/component-tagger",
  },
];

export function AppUpgrades({ appId }: { appId: number | null }) {
  // State to track upgrade status
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(
    null,
  );
  const [upgraded, setUpgraded] = useState<string[]>([]); // list of upgraded ids

  const handleUpgrade = async (upgradeId: string) => {
    setUpgrading(upgradeId);
    setError(null);
    // Simulate an async upgrade process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate success or failure
    if (Math.random() > 0.5) {
      // Success
      setUpgraded((prev) => [...prev, upgradeId]);
    } else {
      // Failure
      setError({
        id: upgradeId,
        message: "Upgrade failed. Please follow the manual instructions.",
      });
    }

    setUpgrading(null);
  };

  const currentUpgrades = availableUpgrades.filter(
    (u) => !upgraded.includes(u.id),
  );

  if (!appId) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
        App Upgrades
      </h3>
      {currentUpgrades.length === 0 ? (
        <div className="p-4 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800/50 rounded-lg text-sm text-green-800 dark:text-green-300">
          App is up-to-date and has all Dyad capabilities enabled
        </div>
      ) : (
        <div className="space-y-4">
          {currentUpgrades.map((upgrade) => (
            <div
              key={upgrade.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-start"
            >
              <div className="flex-grow">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  {upgrade.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {upgrade.description}
                </p>
                {error && error.id === upgrade.id && (
                  <Alert
                    variant="destructive"
                    className="mt-3 dark:bg-destructive/15"
                  >
                    <Terminal className="h-4 w-4" />
                    <AlertTitle className="dark:text-red-200">
                      Upgrade Failed
                    </AlertTitle>
                    <AlertDescription className="text-xs text-red-400 dark:text-red-300">
                      {error.message}{" "}
                      <a
                        onClick={(e) => {
                          e.stopPropagation();
                          IpcClient.getInstance().openExternalUrl(
                            availableUpgrades.find((u) => u.id === error.id)
                              ?.manualUpgradeUrl ?? "https://dyad.sh/docs",
                          );
                        }}
                        className="underline font-medium hover:dark:text-red-200"
                      >
                        Manual Upgrade Instructions
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <Button
                onClick={() => handleUpgrade(upgrade.id)}
                disabled={upgrading === upgrade.id}
                className="ml-4 flex-shrink-0"
                size="sm"
              >
                {upgrading === upgrade.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Upgrade
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
