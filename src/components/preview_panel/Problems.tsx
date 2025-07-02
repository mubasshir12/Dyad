import { useAtom, useAtomValue } from "jotai";
import { chatProblemsAtom, selectedChatIdAtom } from "@/atoms/chatAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import {
  AlertTriangle,
  XCircle,
  FileText,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { Problem, ProblemReport } from "@/ipc/ipc_types";
import { Button } from "@/components/ui/button";
import { IpcClient } from "@/ipc/ipc_client";

import { useState } from "react";
import { useStreamChat } from "@/hooks/useStreamChat";
import { createProblemFixPrompt } from "@/shared/problem_prompt";

interface ProblemItemProps {
  problem: Problem;
}

const ProblemItem = ({ problem }: ProblemItemProps) => {
  return (
    <div className="flex items-start gap-3 p-3 border-b border-border hover:bg-[var(--background-darkest)] transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <XCircle size={16} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{problem.file}</span>

          <span className="text-xs text-muted-foreground">
            {problem.line}:{problem.column}
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          {problem.message}
        </p>
      </div>
    </div>
  );
};

interface RecheckButtonProps {
  appId: number;
  onProblemReportUpdate: (appId: number, problemReport: ProblemReport) => void;
  size?: "sm" | "default" | "lg";
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
}

const RecheckButton = ({
  appId,
  onProblemReportUpdate,
  size = "sm",
  variant = "outline",
  className = "h-7 px-3 text-xs",
}: RecheckButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRecheck = async () => {
    setIsLoading(true);
    try {
      const ipcClient = IpcClient.getInstance();
      const problemReport = await ipcClient.checkProblems({ appId });
      onProblemReportUpdate(appId, problemReport);
    } catch (error) {
      console.error("Failed to recheck problems:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleRecheck}
      disabled={isLoading}
      className={className}
    >
      <RefreshCw
        size={14}
        className={`mr-1 ${isLoading ? "animate-spin" : ""}`}
      />
      {isLoading ? "Checking..." : "Recheck"}
    </Button>
  );
};

interface ProblemsSummaryProps {
  problemReport: ProblemReport;
  appId: number;
  onProblemReportUpdate: (appId: number, problemReport: ProblemReport) => void;
}

const ProblemsSummary = ({
  problemReport,
  appId,
  onProblemReportUpdate,
}: ProblemsSummaryProps) => {
  const { streamMessage } = useStreamChat();
  const { problems } = problemReport;
  const totalErrors = problems.length;
  const [selectedChatId] = useAtom(selectedChatIdAtom);
  const handleFixAll = () => {
    if (!selectedChatId) {
      return;
    }
    streamMessage({
      prompt: createProblemFixPrompt(problemReport),
      chatId: selectedChatId,
    });
  };

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-3">
          <div className="w-6 h-6 rounded-full bg-green-500"></div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">No problems found</p>
        <RecheckButton
          appId={appId}
          onProblemReportUpdate={onProblemReportUpdate}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[var(--background-darkest)] border-b border-border">
      <div className="flex items-center gap-4">
        {totalErrors > 0 && (
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            <span className="text-sm font-medium">
              {totalErrors} {totalErrors === 1 ? "error" : "errors"}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <RecheckButton
          appId={appId}
          onProblemReportUpdate={onProblemReportUpdate}
        />
        <Button
          size="sm"
          variant="default"
          onClick={handleFixAll}
          className="h-7 px-3 text-xs"
        >
          <Wrench size={14} className="mr-1" />
          Fix All
        </Button>
      </div>
    </div>
  );
};

export function Problems() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [chatProblems, setChatProblems] = useAtom(chatProblemsAtom);

  // Get the problem report for the selected app
  const problemReport = selectedAppId ? chatProblems[selectedAppId] : null;

  const handleProblemReportUpdate = (
    appId: number,
    problemReport: ProblemReport,
  ) => {
    setChatProblems((problems) => ({
      ...problems,
      [appId]: problemReport,
    }));
  };

  if (!selectedAppId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-[var(--background-darkest)] flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No App Selected</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Select an app to view TypeScript problems and diagnostic information.
        </p>
      </div>
    );
  }

  if (!problemReport) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-[var(--background-darkest)] flex items-center justify-center mb-4">
          <FileText size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Problems Data</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          No TypeScript diagnostics available for this app yet. Problems will
          appear here after running type checking.
        </p>
        <RecheckButton
          appId={selectedAppId}
          onProblemReportUpdate={handleProblemReportUpdate}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ProblemsSummary
        problemReport={problemReport}
        appId={selectedAppId}
        onProblemReportUpdate={handleProblemReportUpdate}
      />
      <div className="flex-1 overflow-y-auto">
        {problemReport.problems.map((problem, index) => (
          <ProblemItem
            key={`${problem.file}-${problem.line}-${problem.column}-${index}`}
            problem={problem}
          />
        ))}
      </div>
    </div>
  );
}
