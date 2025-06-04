import { useEffect } from "react";
import { useQuery, QueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { useAtom } from "jotai";
import { currentAppAtom } from "@/atoms/appAtoms";
import { App } from "@/ipc/ipc_types";

export function useLoadApp(appId: number | null) {
  const [, setApp] = useAtom(currentAppAtom);
  // const queryClient = useQueryClient(); // This instance is local to the hook

  const {
    data: appData,
    isLoading: loading,
    error,
    refetch: refreshApp,
  } = useQuery<App | null, Error>({
    queryKey: ["app", appId],
    queryFn: async () => {
      if (appId === null) {
        return null;
      }
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getApp(appId);
    },
    enabled: appId !== null,
    initialData: null,
    meta: { showErrorToast: true },
  });

  useEffect(() => {
    if (appId === null) {
      setApp(null);
    } else if (appData !== undefined) {
      setApp(appData);
    }
  }, [appId, appData, setApp]);

  // This effect handles the case where the query is disabled (appId is null)
  // and ensures the app state is reset. It might be redundant with the above useEffect
  // but ensures clarity for the disabled state.
  useEffect(() => {
    if (appId === null) {
      setApp(null);
    }
  }, [appId, setApp]);

  return { app: appData, loading, error, refreshApp };
}

// Function to invalidate the app query
export const invalidateAppQuery = (
  queryClient: QueryClient,
  { appId }: { appId: number | null },
) => {
  return queryClient.invalidateQueries({ queryKey: ["app", appId] });
};
