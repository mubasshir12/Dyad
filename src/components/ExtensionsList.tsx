import React from "react";
import { useExtensions } from "@/hooks/useExtensions";

interface ExtensionsListProps {
  show: boolean;
}

export const ExtensionsList: React.FC<ExtensionsListProps> = ({ show }) => {
  const { extensions, toggleExtension } = useExtensions();

  if (!show) {
    return null;
  }

  const handleToggle = async (extensionId: string, enabled: boolean) => {
    try {
      await toggleExtension({ extensionId, enabled });
    } catch (error) {
      console.error("Error toggling extension:", error);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Extensions</h3>
      <div className="space-y-3">
        {extensions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No extensions installed
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
                    onChange={(e) =>
                      handleToggle(extension.id, e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {extension.description}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    extension.installed
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {extension.installed ? "Installed" : "Not installed"}
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
