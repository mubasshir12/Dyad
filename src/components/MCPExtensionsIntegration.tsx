import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Package, Trash2, Edit } from "lucide-react";
import { useExtensions } from "@/hooks/useExtensions";
import { MCPExtension } from "@/mcp/MCPExtensionManager";
import { AddExtensionDialog } from "./AddExtensionDialog";
import { UpdateExtensionDialog } from "./UpdateExtensionDialog";
import { showSuccess, showError } from "@/lib/toast";

export function MCPExtensionsIntegration() {
  const {
    extensions,
    isLoading,
    addExtension,
    deleteExtension,
    toggleExtension,
    updateExtension,
    installNpmPackage,
    isAdding,
    isInstalling,
    isUpdating,
    isEnabling,
    isDisabling,
    isRemoving,
  } = useExtensions();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExtension, setEditingExtension] = useState<MCPExtension | null>(
    null,
  );

  const handleAddExtension = async (
    extension: Omit<MCPExtension, "id" | "installed">,
  ) => {
    try {
      await addExtension(extension);
      setIsAddDialogOpen(false);
      showSuccess("Extension erfolgreich hinzugefügt");
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Extension:", error);
      showError("Fehler beim Hinzufügen der Extension");
    }
  };

  const handleRemoveExtension = async (extensionId: string) => {
    try {
      await deleteExtension(extensionId);
      showSuccess("Extension erfolgreich entfernt");
    } catch (error) {
      console.error("Fehler beim Entfernen der Extension:", error);
      showError("Fehler beim Entfernen der Extension");
    }
  };

  const handleToggleExtension = async (
    extensionId: string,
    enabled: boolean,
  ) => {
    try {
      await toggleExtension({ extensionId, enabled });
      showSuccess(`Extension ${enabled ? "aktiviert" : "deaktiviert"}`);
    } catch (error) {
      console.error("Fehler beim Umschalten der Extension:", error);
      showError("Fehler beim Umschalten der Extension");
    }
  };

  const handleEditExtension = (extension: MCPExtension) => {
    setEditingExtension(extension);
  };

  const handleUpdateExtension = async (
    extensionId: string,
    updates: Partial<MCPExtension>,
  ) => {
    try {
      await updateExtension({ extensionId, updates });
      setEditingExtension(null);
      showSuccess("Extension erfolgreich aktualisiert");
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Extension:", error);
      showError("Fehler beim Aktualisieren der Extension");
    }
  };

  const handleInstallNpmPackage = async (
    packageName: string,
    config?: Partial<MCPExtension>,
  ) => {
    try {
      await installNpmPackage({ packageName, config });
      setIsAddDialogOpen(false);
      showSuccess("NPM-Paket erfolgreich installiert");
    } catch (error) {
      console.error("Fehler beim Installieren des NPM-Pakets:", error);
      showError("Fehler beim Installieren des NPM-Pakets");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Lade Extensions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            MCP Extensions
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Model Context Protocol Extensions erweitern Dyads Fähigkeiten
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Extension hinzufügen
        </Button>
      </div>

      {extensions.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Keine Extensions verfügbar
          </p>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Erste Extension hinzufügen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {extensions.map((extension) => (
            <div
              key={extension.id}
              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {extension.name}
                  </h4>
                  {extension.enabled && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                      Aktiv
                    </span>
                  )}
                </div>
                {extension.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {extension.description}
                  </p>
                )}
                {extension.category && (
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded mt-1">
                    {extension.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    handleToggleExtension(extension.id, !extension.enabled)
                  }
                  size="sm"
                  variant={extension.enabled ? "default" : "outline"}
                  disabled={isEnabling || isDisabling}
                >
                  {extension.enabled ? "Deaktivieren" : "Aktivieren"}
                </Button>
                <Button
                  onClick={() => handleEditExtension(extension)}
                  size="sm"
                  variant="outline"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleRemoveExtension(extension.id)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  disabled={isRemoving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddExtensionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddExtension}
        onInstallNpmPackage={handleInstallNpmPackage}
        isAdding={isAdding}
        isInstalling={isInstalling}
      />

      {editingExtension && (
        <UpdateExtensionDialog
          open={!!editingExtension}
          onOpenChange={(open) => !open && setEditingExtension(null)}
          extension={editingExtension}
          onUpdate={handleUpdateExtension}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
}
