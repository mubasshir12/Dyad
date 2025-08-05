import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Download, Trash2, Settings, Star, Package } from "lucide-react";
import { MCPExtension } from "@/mcp/MCPExtensionManager";

interface ExtensionCardProps {
  extension: MCPExtension;
  onToggle: (extensionId: string, enabled: boolean) => void;
  onDelete: (extensionId: string) => void;
  onUpdate: (extensionId: string, updates: Partial<MCPExtension>) => void;
}

export const ExtensionCard: React.FC<ExtensionCardProps> = ({
  extension,
  onToggle,
  onDelete,
  onUpdate,
}) => {
  const handleToggle = (enabled: boolean) => {
    onToggle(extension.id, enabled);
  };

  const handleDelete = () => {
    onDelete(extension.id);
  };

  const handleUpdate = () => {
    onUpdate(extension.id, {});
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">{extension.name}</CardTitle>
            {extension.isOfficial && (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={extension.enabled}
              onCheckedChange={handleToggle}
              disabled={!extension.installed}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUpdate}
              disabled={!extension.installed}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
          {extension.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={extension.installed ? "default" : "secondary"}>
              {extension.installed ? "Installiert" : "Nicht installiert"}
            </Badge>
            {extension.category && (
              <Badge variant="outline">{extension.category}</Badge>
            )}
            {extension.version && (
              <Badge variant="outline">v{extension.version}</Badge>
            )}
          </div>
          {!extension.installed && (
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Installieren
            </Button>
          )}
        </div>
        {extension.author && (
          <p className="text-xs text-gray-500 mt-2">Von: {extension.author}</p>
        )}
      </CardContent>
    </Card>
  );
};
