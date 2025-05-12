import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

interface DeleteCustomModelParams {
  providerId: string;
  modelApiName: string;
}

export function useDeleteCustomModel({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, DeleteCustomModelParams>({
    mutationFn: async (params: DeleteCustomModelParams) => {
      if (!params.providerId || !params.modelApiName) {
        throw new Error(
          "Provider ID and Model API Name are required for deletion.",
        );
      }
      const ipcClient = IpcClient.getInstance();
      // This method will be added to IpcClient next
      await ipcClient.deleteCustomModel(params);
    },
    onSuccess: () => {
      // Invalidate queries related to language models for the specific provider
      queryClient.invalidateQueries({
        queryKey: [
          "languageModelsForProvider" /* we might need providerId here if key includes it */,
        ],
      });
      // Invalidate general model list if needed
      queryClient.invalidateQueries({ queryKey: ["languageModels"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error("Error deleting custom model:", error);
      onError?.(error);
    },
    meta: {
      // Optional: for global error handling like toasts
      showErrorToast: true,
    },
  });

  return mutation;
}
