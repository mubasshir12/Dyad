import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings, Trash2, Play, Square } from "lucide-react";
import { MCPExtension } from "@/mcp/MCPExtensionManager";

interface ExtensionCardProps {
  extension: MCPExtension;
  onToggle: () => void;
  onRemove: () => void;
  onEdit: () => void;
  isEnabling?: boolean;
  isDisabling?: boolean;
  isRemoving?: boolean;
}

export function ExtensionCard({
  extension,
  onToggle,
  onRemove,
  onEdit,
  isEnabling,
  isDisabling,
  isRemoving,
}: ExtensionCardProps) {
  const isLoading = isEnabling || isDisabling || isRemoving;

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {extension.name}
              {extension.category && (
                <Badge variant="secondary" className="text-xs">
                  {extension.category}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-2">
              {extension.description}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={extension.enabled}
              onCheckedChange={onToggle}
              disabled={isLoading}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              disabled={isLoading}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Typ:</span>
            <Badge variant="outline">{extension.type}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Befehl:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {extension.command} {extension.args?.join(" ")}
            </code>
          </div>
          {extension.timeout && (
            <div className="flex items-center justify-between">
              <span>Timeout:</span>
              <span>{extension.timeout}s</span>
            </div>
          )}
          {extension.version && (
            <div className="flex items-center justify-between">
              <span>Version:</span>
              <span>{extension.version}</span>
            </div>
          )}
          {extension.author && (
            <div className="flex items-center justify-between">
              <span>Autor:</span>
              <span>{extension.author}</span>
            </div>
          )}
        </div>

        {extension.env && Object.keys(extension.env).length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Umgebungsvariablen:
            </p>
            <div className="space-y-1">
              {Object.entries(extension.env).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-mono">{key}:</span>
                  <span className="text-muted-foreground">
                    {value.length > 20 ? `${value.substring(0, 20)}...` : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            {extension.enabled ? (
              <>
                <Play className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Aktiv</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-muted-foreground">Inaktiv</span>
              </>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">
                {isEnabling && "Aktiviere..."}
                {isDisabling && "Deaktiviere..."}
                {isRemoving && "Entferne..."}
              </span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
