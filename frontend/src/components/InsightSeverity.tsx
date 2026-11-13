import {
  AlertOctagon,
  AlertTriangle,
  BadgeCheck,
  Info,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const SEVERITY_STYLES: Record<
  string,
  { icon: LucideIcon; iconClass: string; tileClass: string; borderClass: string; label: string }
> = {
  critical: {
    icon: AlertOctagon,
    iconClass: "text-red-600",
    tileClass: "bg-red-50",
    borderClass: "border-red-100",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    tileClass: "bg-amber-50",
    borderClass: "border-amber-100",
    label: "Warning",
  },
  positive: {
    icon: BadgeCheck,
    iconClass: "text-emerald-600",
    tileClass: "bg-emerald-50",
    borderClass: "border-emerald-100",
    label: "On track",
  },
  suggestion: {
    icon: Lightbulb,
    iconClass: "text-violet-600",
    tileClass: "bg-violet-50",
    borderClass: "border-violet-100",
    label: "Suggestion",
  },
  info: {
    icon: Info,
    iconClass: "text-sky-600",
    tileClass: "bg-sky-50",
    borderClass: "border-sky-100",
    label: "Insight",
  },
};

export function SeverityIcon({ severity, className }: { severity: string; className?: string }) {
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
  const Icon = style.icon;
  return (
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", style.tileClass, className)}>
      <Icon className={cn("h-[18px] w-[18px]", style.iconClass)} strokeWidth={1.9} />
    </div>
  );
}
