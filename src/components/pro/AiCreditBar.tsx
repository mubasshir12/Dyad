"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AICreditStatusProps {
  totalCredits: number;
  usedCredits: number;
  resetDays?: number;
  className?: string;
}

export function AICreditStatus({
  totalCredits,
  usedCredits,
  resetDays,
  className,
}: AICreditStatusProps) {
  const creditsLeft = totalCredits - usedCredits;
  // Calculate percentage based on creditsLeft for inverted progress
  const percentage = totalCredits > 0 ? (creditsLeft / totalCredits) * 100 : 0;
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    // Simulate progress animation
    const timer = setTimeout(() => setProgress(percentage), 500);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "ml-2 max-w-30 w-full space-y-2 cursor-pointer",
              className,
            )}
          >
            <div className="relative h-7">
              <Progress
                value={progress}
                className="h-full shadow-md bg-indigo-500 dark:bg-indigo-400"
              />
              <span
                className="absolute inset-0 flex items-center justify-center text-sm font-medium text-indigo-800 dark:text-indigo-200 drop-shadow-md
                  bg-indigo-100/60 dark:bg-indigo-900/40 px-2 py-0.5 rounded-xs transition-colors"
                style={{ pointerEvents: "none" }}
              >
                {creditsLeft} credits left
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="w-auto p-2 text-sm">
          <p>{usedCredits} credits used</p>
          <p>{creditsLeft} credits remaining</p>
          <p>{totalCredits} total credits</p>
          {resetDays !== undefined && <p>Resets in {resetDays} days</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
