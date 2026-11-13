export function formatCurrency(
  amount: number | null | undefined,
  currency = "INR",
  options?: { maximumFractionDigits?: number; compact?: boolean },
): string {
  const value = Number(amount ?? 0);
  const locale = currency === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
      minimumFractionDigits: options?.maximumFractionDigits ?? 2,
      notation: options?.compact ? "compact" : "standard",
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatCompactCurrency(amount: number, currency = "INR"): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatCurrency(amount, currency);
  }
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${Number(value ?? 0).toFixed(digits)}%`;
}

export function parseDate(value: string): Date {
  // Treat YYYY-MM-DD as a local calendar date (avoids UTC day shifts).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function monthKeyToLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function lastNMonths(n: number): { year: number; month: number; label: string }[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const point = shiftMonth(now.getFullYear(), now.getMonth() + 1, -(n - 1 - i));
    return {
      year: point.year,
      month: point.month,
      label: new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(
        new Date(point.year, point.month - 1, 1),
      ),
    };
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function apiDateToMonth(dateValue: string): string {
  return dateValue.slice(0, 7);
}
