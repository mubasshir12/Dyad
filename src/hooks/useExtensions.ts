import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { MCPExtension } from "@/mcp/MCPExtensionManager";

const ipcClient = IpcClient.getInstance();

export function useExtensions() {
  const queryClient = useQueryClient();

  const {
    data: extensions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["extensions"],
    queryFn: async (): Promise<MCPExtension[]> => {
      return await ipcClient.listExtensions();
    },
  });

  const addExtensionMutation = useMutation({
    mutationFn: async (extension: Omit<MCPExtension, "id" | "installed">) => {
      return await ipcClient.addExtension(extension);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extensions"] });
    },
  });

  const updateExtensionMutation = useMutation({
    mutationFn: async ({ extensionId, updates }: { extensionId: string; updates: Partial<MCPExtension> }) => {
      return await ipcClient.updateExtension({ extensionId, updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extensions"] });
    },
  });

  const deleteExtensionMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      return await ipcClient.deleteExtension(extensionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extensions"] });
    },
  });

  const toggleExtensionMutation = useMutation({
    mutationFn: async ({ extensionId, enabled }: { extensionId: string; enabled: boolean }) => {
      return await ipcClient.toggleExtension({ extensionId, enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extensions"] });
    },
  });

  const installNpmPackageMutation = useMutation({
    mutationFn: async ({ packageName, config }: { packageName: string; config?: Partial<MCPExtension> }) => {
      return await ipcClient.installNpmPackage({ packageName, config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extensions"] });
    },
  });

  return {
    extensions,
    isLoading,
    error,
    refetch,
    addExtension: addExtensionMutation.mutateAsync,
    updateExtension: updateExtensionMutation.mutateAsync,
    deleteExtension: deleteExtensionMutation.mutateAsync,
    toggleExtension: toggleExtensionMutation.mutateAsync,
    installNpmPackage: installNpmPackageMutation.mutateAsync,
  };
} 