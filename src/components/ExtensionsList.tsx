import React from "react";
import { useExtensions } from "@/hooks/useExtensions";
import { ExtensionCard } from "./ExtensionCard";
import { MCPExtension } from "@/mcp/MCPExtensionManager";

interface ExtensionsListProps {
  show: boolean;
}

export const ExtensionsList: React.FC<ExtensionsListProps> = ({ show }) => {
  const { extensions, toggleExtension, deleteExtension, updateExtension } = useExtensions();

  if (!show) {
    return null;
  }

  const handleToggle = async (extensionId: string, enabled: boolean) => {
    try {
      await toggleExtension({ extensionId, enabled });
    } catch (error) {
      console.error("Fehler beim Umschalten der Extension:", error);
    }
  };

  const handleDelete = async (extensionId: string) => {
    try {
      await deleteExtension(extensionId);
    } catch (error) {
      console.error("Fehler beim Löschen der Extension:", error);
    }
  };

  const handleUpdate = async (extensionId: string, updates: Partial<MCPExtension>) => {
    try {
      await updateExtension({ extensionId, updates });
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Extension:", error);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Extensions</h3>
      <div className="space-y-3">
        {extensions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Keine Extensions installiert
          </p>
        ) : (
          extensions.map((extension) => (
            <div key={extension.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{extension.name}</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={extension.enabled}
                    onChange={(e) => handleToggle(extension.id, e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {extension.description}
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  extension.installed 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {extension.installed ? "Installiert" : "Nicht installiert"}
                </span>
                {extension.category && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {extension.category}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}; 