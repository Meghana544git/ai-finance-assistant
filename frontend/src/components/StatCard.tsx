import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "emerald" | "rose" | "navy" | "amber" | "violet";
  valueClassName?: string;
  className?: string;
}

const TONES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  rose: "bg-rose-50 text-rose-500 border-rose-100",
  navy: "bg-slate-100 text-navy-800 border-slate-200",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "emerald",
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 truncate text-[22px] font-bold tracking-tight text-navy-900 sm:text-2xl",
              valueClassName,
            )}
          >
            {value}
          </p>
        </div>
        <div className={cn("stat-tile shrink-0", TONES[tone])}>
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs leading-relaxed text-slate-400">{hint}</p>}
    </Card>
  );
}
