import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Rocket, LinkIcon, PlusCircle, Unlink, UploadCloudIcon, Loader2, ExternalLink, Info } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { useSettings } from "@/hooks/useSettings";
import { useLoadApp } from "@/hooks/useLoadApp";
import { VercelProject } from "@/ipc/ipc_types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/lib/toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "@tanstack/react-router";
import { vercelSettingsRoute } from "@/routes/settings/vercel";

interface VercelConnectorProps {
  appId: number;
}

export function VercelConnector({ appId }: VercelConnectorProps) {
  const { settings } = useSettings();
  const { app: currentDyadApp, refreshApp: refreshDyadApp } = useLoadApp(appId);
  const navigate = useNavigate();

  const [vercelProjects, setVercelProjects] = useState<VercelProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const isVercelConfigured = !!settings?.vercel?.accessToken?.value;
  const linkedVercelProjectId = currentDyadApp?.vercelProjectId;
  const linkedVercelProjectName = currentDyadApp?.vercelProjectName;

  const fetchVercelProjects = async () => {
    if (isVercelConfigured) {
      setIsLoadingProjects(true);
      try {
        const projects = await IpcClient.getInstance().listVercelProjects();
        setVercelProjects(projects);
      } catch (err) {
        showError("Failed to load Vercel projects: " + (err as Error).message);
        setVercelProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    } else {
      setVercelProjects([]);
    }
  };

  useEffect(() => {
    fetchVercelProjects();
  }, [isVercelConfigured, settings?.vercel?.accessToken?.value]);

  const handleLinkProject = async (projectId: string) => {
    try {
      await IpcClient.getInstance().setVercelAppProject(appId, projectId);
      await refreshDyadApp();
      showSuccess(`Project "${vercelProjects.find(p => p.id === projectId)?.name || projectId}" linked successfully.`);
    } catch (err) {
      showError("Failed to link Vercel project: " + (err as Error).message);
    }
  };

  const handleUnlinkProject = async () => {
    try {
      await IpcClient.getInstance().unsetVercelAppProject(appId);
      await refreshDyadApp();
      showSuccess("Vercel project unlinked successfully.");
    } catch (err) {
      showError("Failed to unlink Vercel project: " + (err as Error).message);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      showError("Project name cannot be empty.");
      return;
    }
    setIsCreatingProject(true);
    try {
      const newProject = await IpcClient.getInstance().createVercelProject(newProjectName.trim());
      showSuccess(`Vercel project "${newProject.name}" created successfully!`);
      setNewProjectName("");
      setIsCreateProjectDialogOpen(false);
      await fetchVercelProjects();
      await handleLinkProject(newProject.id);
    } catch (err) {
      showError("Failed to create Vercel project: " + (err as Error).message);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeploy = async () => {
    if (!linkedVercelProjectId) {
      showError("Please link a Vercel project first.");
      return;
    }
    setIsDeploying(true);
    try {
      // Placeholder for actual deployment logic
      await IpcClient.getInstance().deployVercelProject({ appId, projectId: linkedVercelProjectId });
      showSuccess("Deployment to Vercel initiated (placeholder).");
    } catch (err) {
      showError("Failed to initiate deployment: " + (err as Error).message);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!isVercelConfigured) {
    return (
      <Card className="mt-1">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Rocket className="mr-2 h-5 w-5" /> Vercel Deployment
          </CardTitle>
          <CardDescription>
            Connect your Vercel account to deploy this app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate({ to: vercelSettingsRoute.id })}>
            Configure Vercel
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (linkedVercelProjectId && linkedVercelProjectName) {
    return (
      <Card className="mt-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Rocket className="mr-2 h-5 w-5" /> Vercel Project
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const projectUrl = vercelProjects.find(p => p.id === linkedVercelProjectId)?.url;
                if (projectUrl) {
                  IpcClient.getInstance().openExternalUrl(projectUrl);
                } else {
                  IpcClient.getInstance().openExternalUrl(`https://vercel.com/${settings?.githubUser?.email || ""}/${linkedVercelProjectName}`);
                }
              }}
              className="ml-2 px-2 py-1 h-auto"
            >
              View on Vercel <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </CardTitle>
          <CardDescription>
            This app is linked to: <span className="font-medium">{linkedVercelProjectName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleDeploy} disabled={isDeploying} className="w-full">
            {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloudIcon className="mr-2 h-4 w-4" />}
            {isDeploying ? "Deploying..." : "Deploy to Vercel"}
          </Button>
          <Button variant="outline" onClick={handleUnlinkProject} className="w-full">
            <Unlink className="mr-2 h-4 w-4" /> Unlink Project
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-1">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Rocket className="mr-2 h-5 w-5" /> Link to Vercel Project
        </CardTitle>
        <CardDescription>
          Select an existing Vercel project or create a new one to link to this app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingProjects ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : vercelProjects.length > 0 ? (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto border rounded-md p-2">
            {vercelProjects.map(project => (
              <Button
                key={project.id}
                variant={"outline"}
                onClick={() => handleLinkProject(project.id)}
                className="w-full justify-start"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {project.name}
              </Button>
            ))}
          </div>
        ) : (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>No Vercel Projects Found</AlertTitle>
            <AlertDescription>
              Ensure your Access Token is correct and has permission to list projects, or create a new one below.
            </AlertDescription>
          </Alert>
        )}
        <Dialog open={isCreateProjectDialogOpen} onOpenChange={setIsCreateProjectDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Vercel Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Vercel Project</DialogTitle>
              <DialogDescription>
                Enter a name for your new Vercel project. This will also be used for the URL.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="my-awesome-dyad-app"
                disabled={isCreatingProject}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateProjectDialogOpen(false)} disabled={isCreatingProject}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingProject || !newProjectName.trim()}>
                  {isCreatingProject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCreatingProject ? "Creating..." : "Create & Link Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}