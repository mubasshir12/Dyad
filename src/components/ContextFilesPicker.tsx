import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

import { FileCode, InfoIcon, Trash2 } from "lucide-react";
import React, { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { useSettings } from "@/hooks/useSettings";
import { Badge } from "./ui/badge";
import { useContextPaths } from "@/hooks/useContextPaths";

// This type is now coming from the backend via the hook
// interface ContextFile {
//   id: string;
//   path: string;
//   fileCount: number;
//   tokenCount: number;
//   force: boolean;
// }

export function ContextFilesPicker() {
  const { settings } = useSettings();
  const { contextPaths, updateContextPaths } = useContextPaths();
  const [isOpen, setIsOpen] = useState(false);
  const [newPath, setNewPath] = useState("");

  const addPath = () => {
    if (
      newPath.trim() === "" ||
      contextPaths.find((p) => p.globPath === newPath)
    ) {
      setNewPath("");
      return;
    }
    const newPaths = [
      ...contextPaths.map(({ globPath, force }) => ({ globPath, force })),
      {
        globPath: newPath,
        force: false,
      },
    ];
    updateContextPaths(newPaths);
    setNewPath("");
  };

  const removePath = (pathToRemove: string) => {
    const newPaths = contextPaths
      .filter((p) => p.globPath !== pathToRemove)
      .map(({ globPath, force }) => ({ globPath, force }));
    updateContextPaths(newPaths);
  };

  const toggleForce = (pathToToggle: string) => {
    const newPaths = contextPaths.map(({ globPath, force }) => {
      if (globPath === pathToToggle) {
        return { globPath, force: !force };
      }
      return { globPath, force };
    });
    updateContextPaths(newPaths);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <FileCode className="size-4" />
          <span>Context</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="relative space-y-4">
          {settings?.enableProSmartFilesContextMode && (
            <Badge
              variant="outline"
              className="absolute top-0 right-0 -translate-y-1/2"
            >
              Smart Context
            </Badge>
          )}
          <div>
            <h3 className="font-medium">Codebase Context</h3>
            <p className="text-sm text-muted-foreground">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                      Select the files to use as context.{" "}
                      <InfoIcon className="size-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">
                    <p>By default, Dyad uses your whole codebase.</p>
                    <p>
                      With Smart Context, Dyad uses the most relevant files as
                      context.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>

          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              type="text"
              placeholder="src/**/*.tsx"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addPath();
                }
              }}
            />
            <Button type="submit" onClick={addPath}>
              Add
            </Button>
          </div>

          <TooltipProvider>
            {contextPaths.length > 0 ? (
              <div className="space-y-2">
                {contextPaths.map((p) => (
                  <div
                    key={p.globPath}
                    className="flex items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate font-mono text-sm">
                            {p.globPath}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{p.globPath}</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs text-muted-foreground">
                        {p.files} files, ~{p.tokens} tokens
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings?.enableProSmartFilesContextMode && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={p.force}
                            onCheckedChange={() => toggleForce(p.globPath)}
                            id={`force-${p.globPath}`}
                          />
                          <label
                            htmlFor={`force-${p.globPath}`}
                            className="text-xs text-muted-foreground"
                          >
                            Always
                          </label>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePath(p.globPath)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {settings?.enableProSmartFilesContextMode
                    ? "Dyad will use Smart Context to automatically find the most relevant files to use as context."
                    : "Dyad will use the entire codebase as context."}
                </p>
              </div>
            )}
          </TooltipProvider>
        </div>
      </PopoverContent>
    </Popover>
  );
}
