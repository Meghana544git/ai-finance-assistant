import { Loader2 } from "lucide-react";

export function FullPageLoader({ label = "Loading your workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 shadow-lift">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}…</p>
    </div>
  );
}
