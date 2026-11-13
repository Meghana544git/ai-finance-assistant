import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "dark" | "light";
  compact?: boolean;
  className?: string;
}

export function Logo({ variant = "dark", compact = false, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-navy-900 shadow-sm">
        <svg viewBox="0 0 28 28" className="h-5 w-5" aria-hidden="true">
          <path
            d="M5 21V14M10.5 21V9M16 21V16M21.5 21V5"
            stroke="#34D399"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="21.5" cy="5" r="2" fill="#6EE7B7" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p
            className={cn(
              "text-[15px] font-bold tracking-tight",
              variant === "light" ? "text-white" : "text-navy-900",
            )}
          >
            AI Finance
          </p>
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.16em]",
              variant === "light" ? "text-emerald-300/80" : "text-slate-400",
            )}
          >
            Assistant
          </p>
        </div>
      )}
    </div>
  );
}
