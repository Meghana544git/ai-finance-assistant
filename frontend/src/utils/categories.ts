import {
  Car,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  ReceiptText,
  Shapes,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import type { Category } from "@/types";

export const CATEGORIES: Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Other",
];

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Food: Utensils,
  Transport: Car,
  Shopping: ShoppingBag,
  Bills: ReceiptText,
  Entertainment: Clapperboard,
  Health: HeartPulse,
  Education: GraduationCap,
  Other: Shapes,
};

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#10b981",
  Transport: "#3b82f6",
  Shopping: "#8b5cf6",
  Bills: "#f59e0b",
  Entertainment: "#ec4899",
  Health: "#ef4444",
  Education: "#06b6d4",
  Other: "#64748b",
};

export function categoryColor(category: string | null | undefined): string {
  return CATEGORY_COLORS[category ?? "Other"] ?? CATEGORY_COLORS.Other;
}

export const CURRENCIES = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "AED", label: "UAE Dirham" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "SGD", label: "Singapore Dollar" },
];
