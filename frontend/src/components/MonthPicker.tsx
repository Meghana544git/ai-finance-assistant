import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { shiftMonth } from "@/utils/format";

interface MonthPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  className?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MonthPicker({ month, year, onChange, className }: MonthPickerProps) {
  const move = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    onChange(next.month, next.year);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1 shadow-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(-1)} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[116px] px-1 text-center text-sm font-semibold text-navy-900">
          {MONTHS[month - 1]} {year}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(1)} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
