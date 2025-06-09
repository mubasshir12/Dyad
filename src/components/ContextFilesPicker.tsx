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

interface ContextFile {
  id: string;
  path: string;
  fileCount: number;
  tokenCount: number;
  force: boolean;
}

export function ContextFilesPicker() {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [paths, setPaths] = useState<ContextFile[]>([]);
  const [newPath, setNewPath] = useState("");

  const addPath = () => {
    if (newPath.trim() === "") return;
    setPaths([
      ...paths,
      {
        id: crypto.randomUUID(),
        path: newPath,
        fileCount: Math.floor(Math.random() * 10), // Mock
        tokenCount: Math.floor(Math.random() * 5000), // Mock
        force: false,
      },
    ]);
    setNewPath("");
  };

  const removePath = (id: string) => {
    setPaths(paths.filter((p) => p.id !== id));
  };

  const toggleForce = (id: string) => {
    setPaths(paths.map((p) => (p.id === id ? { ...p, force: !p.force } : p)));
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
            {paths.length > 0 ? (
              <div className="space-y-2">
                {paths.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate font-mono text-sm">
                            {p.path}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{p.path}</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs text-muted-foreground">
                        {p.fileCount} files, ~{p.tokenCount} tokens
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings?.enableProSmartFilesContextMode && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={p.force}
                            onCheckedChange={() => toggleForce(p.id)}
                            id={`force-${p.id}`}
                          />
                          <label
                            htmlFor={`force-${p.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            Always
                          </label>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePath(p.id)}
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
