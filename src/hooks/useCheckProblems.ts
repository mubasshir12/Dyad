import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { IpcClient } from "@/ipc/ipc_client";
import { chatProblemsAtom } from "@/atoms/chatAtoms";
import type { ProblemReport } from "@/ipc/ipc_types";

export function useCheckProblems(appId: number | null) {
  const [chatProblems, setChatProblems] = useAtom(chatProblemsAtom);

  const {
    data: problemReport,
    isLoading: isChecking,
    error,
    refetch: checkProblems,
  } = useQuery<ProblemReport, Error>({
    queryKey: ["problems", appId],
    queryFn: async (): Promise<ProblemReport> => {
      if (!appId) {
        throw new Error("App ID is required");
      }
      const ipcClient = IpcClient.getInstance();
      return ipcClient.checkProblems({ appId });
    },
    enabled: !!appId,
    meta: {
      showErrorToast: true,
    },
  });

  // Sync the query result with the chatProblemsAtom
  useEffect(() => {
    if (problemReport && appId) {
      setChatProblems((problems) => ({
        ...problems,
        [appId]: problemReport,
      }));
    }
  }, [problemReport, appId, setChatProblems]);

  return {
    problemReport: appId ? chatProblems[appId] || problemReport : null,
    isChecking,
    error,
    checkProblems,
    safeCheckProblems: async () => {
      try {
        await checkProblems();
      } catch (err) {
        // It's OK if this fails (e.g. TS has not been installed yet)
        console.error("Error checking problems:", err);
      }
    },
  };
}
