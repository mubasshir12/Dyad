import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import type { LanguageModelProvider } from "@/ipc/ipc_types";

export function useLanguageModelProviders() {
  const ipcClient = IpcClient.getInstance();

  return useQuery<LanguageModelProvider[], Error>({
    queryKey: ["languageModelProviders"],
    queryFn: async () => {
      return ipcClient.getLanguageModelProviders();
    },
  });
}
