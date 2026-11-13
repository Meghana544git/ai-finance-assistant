import { formatCurrency } from "@/utils/format";

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  currency?: string;
}

export function ChartTooltip({ active, payload, label, currency = "INR" }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5 shadow-lift">
      {label !== undefined && (
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={`${entry.dataKey}-${entry.name}`} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-xs font-medium capitalize text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color ?? "#10b981" }}
              />
              {entry.name}
            </span>
            <span className="text-xs font-bold text-navy-900">
              {formatCurrency(Number(entry.value ?? 0), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
