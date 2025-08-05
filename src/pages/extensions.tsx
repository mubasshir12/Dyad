import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Download, Search } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useExtensions } from "@/hooks/useExtensions";
import { ExtensionCard } from "@/components/ExtensionCard";
import { AddExtensionDialog } from "@/components/AddExtensionDialog";
import { UpdateExtensionDialog } from "@/components/UpdateExtensionDialog";
import { Input } from "@/components/ui/input";
import { MCPExtension } from "@/mcp/MCPExtensionManager";

const ExtensionsPage = () => {
  const router = useRouter();
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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExtension, setEditingExtension] = useState<MCPExtension | null>(
    null,
  );

  const categories = [
    "all",
    ...new Set(extensions.map((ext) => ext.category).filter(Boolean)),
  ];

  const filteredExtensions = extensions.filter((extension) => {
    const matchesSearch =
      extension.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      extension.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || extension.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddExtension = async (
    extension: Omit<MCPExtension, "id" | "installed">,
  ) => {
    try {
      await addExtension(extension);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Extension:", error);
    }
  };

  const handleRemoveExtension = async (extensionId: string) => {
    try {
      await deleteExtension(extensionId);
    } catch (error) {
      console.error("Fehler beim Entfernen der Extension:", error);
    }
  };

  const handleToggleExtension = async (extensionId: string, enabled: boolean) => {
    try {
      await toggleExtension({ extensionId, enabled });
    } catch (error) {
      console.error("Fehler beim Umschalten der Extension:", error);
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
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Extension:", error);
    }
  };

  const handleInstallNpmPackage = async (
    packageName: string,
    config?: Partial<MCPExtension>,
  ) => {
    try {
      await installNpmPackage({ packageName, config });
    } catch (error) {
      console.error("Fehler beim Installieren des NPM-Pakets:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Extensions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.navigate({ to: "/" })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Extensions</h1>
            <p className="text-muted-foreground">
              MCP-Server verwenden, um Dyads Fähigkeiten zu erweitern
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Custom Extension hinzufügen
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Extensions durchsuchen
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Extensions durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "Alle Kategorien" : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Extensions Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExtensions.map((extension) => (
            <ExtensionCard
              key={extension.id}
              extension={extension}
              onToggle={(extensionId, enabled) => handleToggleExtension(extensionId, enabled)}
              onDelete={(extensionId) => handleRemoveExtension(extensionId)}
              onUpdate={(extensionId, updates) => handleUpdateExtension(extensionId, updates)}
            />
          ))}
        </div>

        {filteredExtensions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "all"
                ? "Keine Extensions gefunden"
                : "Keine Extensions verfügbar"}
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Erste Extension hinzufügen
            </Button>
          </div>
        )}
      </div>

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
};

export default ExtensionsPage;
