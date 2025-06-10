import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { IpcClient, ContextPathResult } from "@/ipc/ipc_client";
import { ContextPath } from "@/lib/schemas";

export function useContextPaths() {
  const queryClient = useQueryClient();
  const appId = useAtomValue(selectedAppIdAtom);

  const {
    data: contextPaths,
    isLoading,
    error,
  } = useQuery<ContextPathResult[], Error>({
    queryKey: ["context-paths", appId],
    queryFn: async () => {
      if (!appId) return [];
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getContextPaths(appId);
    },
    enabled: !!appId,
  });

  const updateContextPathsMutation = useMutation<unknown, Error, ContextPath[]>(
    {
      mutationFn: async (paths: ContextPath[]) => {
        if (!appId) throw new Error("No app selected");
        const ipcClient = IpcClient.getInstance();
        return ipcClient.setContextPaths(appId, paths);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["context-paths", appId] });
      },
    },
  );

  return {
    contextPaths: contextPaths || [],
    isLoading,
    error,
    updateContextPaths: updateContextPathsMutation.mutateAsync,
  };
}
