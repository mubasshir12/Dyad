import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MCPExtension } from "@/mcp/MCPExtensionManager";

interface AddExtensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (extension: Omit<MCPExtension, "id" | "installed">) => Promise<void>;
  onInstallNpmPackage: (
    packageName: string,
    config?: Partial<MCPExtension>,
  ) => Promise<void>;
  isAdding: boolean;
  isInstalling: boolean;
}

export function AddExtensionDialog({
  open,
  onOpenChange,
  onAdd,
  onInstallNpmPackage,
  isAdding,
  isInstalling,
}: AddExtensionDialogProps) {
  const [activeTab, setActiveTab] = useState("custom");

  // Custom Extension Form
  const [customForm, setCustomForm] = useState({
    name: "",
    description: "",
    type: "STDIO" as "STDIO" | "HTTP",
    command: "",
    args: "",
    timeout: "300",
    category: "",
    version: "1.0.0",
    author: "",
  });

  // NPM Package Form
  const [npmForm, setNpmForm] = useState({
    packageName: "",
    name: "",
    description: "",
    category: "",
    env: "",
  });

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const extension: Omit<MCPExtension, "id" | "installed"> = {
      name: customForm.name,
      description: customForm.description,
      type: customForm.type,
      command: customForm.command,
      args: customForm.args
        ? customForm.args.split(" ").filter(Boolean)
        : undefined,
      timeout: parseInt(customForm.timeout) || undefined,
      env: {},
      enabled: false,
      category: customForm.category || undefined,
      version: customForm.version,
      author: customForm.author,
    };

    await onAdd(extension);

    // Reset form
    setCustomForm({
      name: "",
      description: "",
      type: "STDIO",
      command: "",
      args: "",
      timeout: "300",
      category: "",
      version: "1.0.0",
      author: "",
    });
  };

  const handleNpmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const env: Record<string, string> = {};
    if (npmForm.env) {
      npmForm.env.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
          env[key.trim()] = value.trim();
        }
      });
    }

    const config: Partial<MCPExtension> = {
      name: npmForm.name || npmForm.packageName,
      description:
        npmForm.description || `MCP-Server for ${npmForm.packageName}`,
      category: npmForm.category || "Custom",
      env,
    };

    await onInstallNpmPackage(npmForm.packageName, config);

    // Reset form
    setNpmForm({
      packageName: "",
      name: "",
      description: "",
      category: "",
      env: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Extension hinzufügen</DialogTitle>
          <DialogDescription>
            Füge eine neue MCP-Extension hinzu oder installiere ein NPM-Paket
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom">Custom Extension</TabsTrigger>
            <TabsTrigger value="npm">NPM-Paket installieren</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="space-y-4">
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={customForm.name}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, name: e.target.value })
                    }
                    placeholder="Meine Extension"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Typ *</Label>
                  <Select
                    value={customForm.type}
                    onValueChange={(value: "STDIO" | "HTTP") =>
                      setCustomForm({ ...customForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STDIO">STDIO</SelectItem>
                      <SelectItem value="HTTP">HTTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung *</Label>
                <Textarea
                  id="description"
                  value={customForm.description}
                  onChange={(e) =>
                    setCustomForm({
                      ...customForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what this extension does..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="command">Command *</Label>
                  <Input
                    id="command"
                    value={customForm.command}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, command: e.target.value })
                    }
                    placeholder="npx"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="args">Arguments</Label>
                  <Input
                    id="args"
                    value={customForm.args}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, args: e.target.value })
                    }
                    placeholder="@modelcontextprotocol/server-filesystem"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={customForm.timeout}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, timeout: e.target.value })
                    }
                    placeholder="300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={customForm.category}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, category: e.target.value })
                    }
                    placeholder="System"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version">Version *</Label>
                  <Input
                    id="version"
                    value={customForm.version}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, version: e.target.value })
                    }
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={customForm.author}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, author: e.target.value })
                  }
                  placeholder="Your Name"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? "Add..." : "Add Extension"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="npm" className="space-y-4">
            <form onSubmit={handleNpmSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="packageName">NPM-Paketname *</Label>
                <Input
                  id="packageName"
                  value={npmForm.packageName}
                  onChange={(e) =>
                    setNpmForm({ ...npmForm, packageName: e.target.value })
                  }
                  placeholder="@modelcontextprotocol/server-filesystem"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="npmName">Display Name</Label>
                  <Input
                    id="npmName"
                    value={npmForm.name}
                    onChange={(e) =>
                      setNpmForm({ ...npmForm, name: e.target.value })
                    }
                    placeholder="Filesystem Server (npm package)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="npmCategory">Category</Label>
                  <Input
                    id="npmCategory"
                    value={npmForm.category}
                    onChange={(e) =>
                      setNpmForm({ ...npmForm, category: e.target.value })
                    }
                    placeholder="System"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="npmDescription">Description</Label>
                <Textarea
                  id="npmDescription"
                  value={npmForm.description}
                  onChange={(e) =>
                    setNpmForm({ ...npmForm, description: e.target.value })
                  }
                  placeholder="Describe what this extension does..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="npmEnv">
                  Environment variables (KEY=VALUE, one per line)
                </Label>
                <Textarea
                  id="npmEnv"
                  value={npmForm.env}
                  onChange={(e) =>
                    setNpmForm({ ...npmForm, env: e.target.value })
                  }
                  placeholder="MCP_FILESYSTEM_ROOT=./workspace\nPOSTGRES_CONNECTION_STRING=postgresql://localhost:5432/test"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isInstalling}>
                  {isInstalling ? "Install..." : "Install NPM Package"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
