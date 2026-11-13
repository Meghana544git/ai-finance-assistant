import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ message, onRetry, compact = false }: ErrorStateProps) {
  return (
    <div
      className={
        compact
          ? "flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3"
          : "flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/40 px-6 py-12 text-center"
      }
      role="alert"
    >
      <div className={compact ? "flex items-center gap-2" : "flex flex-col items-center gap-2"}>
        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
        <p className="text-sm font-medium text-red-700">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className={compact ? "" : "mt-4"}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
