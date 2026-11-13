import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/services/api";
import { budgetService } from "@/services/budgets.service";
import type { Budget, Category } from "@/types";
import { CATEGORIES } from "@/utils/categories";

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
  defaultMonth: number;
  defaultYear: number;
  onSaved: () => void;
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

export function BudgetFormDialog({
  open,
  onOpenChange,
  budget,
  defaultMonth,
  defaultYear,
  onSaved,
}: BudgetFormDialogProps) {
  const { currency } = useAuth();
  const [scope, setScope] = useState<"overall" | "category">("overall");
  const [category, setCategory] = useState<Category>("Food");
  const [limit, setLimit] = useState("");
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (budget) {
      setScope(budget.category ? "category" : "overall");
      setCategory((budget.category as Category) ?? "Food");
      setLimit(String(budget.monthly_limit));
      setMonth(budget.month);
      setYear(budget.year);
    } else {
      setScope("overall");
      setCategory("Food");
      setLimit("");
      setMonth(defaultMonth);
      setYear(defaultYear);
    }
    setError(null);
    setSaving(false);
  }, [open, budget, defaultMonth, defaultYear]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const limitValue = Number(limit);
    if (!Number.isFinite(limitValue) || limitValue <= 0) {
      setError("Enter a monthly limit greater than zero.");
      return;
    }
    if (year < 2000 || year > 2100) {
      setError("Enter a year between 2000 and 2100.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category: scope === "category" ? category : null,
        monthly_limit: Number(limitValue.toFixed(2)),
        month,
        year,
      };
      if (budget) {
        await budgetService.update(budget.id, payload);
        toast.success("Budget updated.");
      } else {
        await budgetService.create(payload);
        toast.success("Budget created. We will track it automatically.");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{budget ? "Edit budget" : "Create a budget"}</DialogTitle>
          <DialogDescription>
            A budget is a monthly spending limit. Create one overall cap or target a specific
            category.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorState message={error} compact />}

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {(["overall", "category"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setScope(option)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                  scope === option ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-navy-900"
                }`}
              >
                {option === "overall" ? "Overall budget" : "Category budget"}
              </button>
            ))}
          </div>

          {scope === "category" && (
            <div className="space-y-2">
              <Label htmlFor="budget-category">Category</Label>
              <Select
                id="budget-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as Category)}
              >
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="budget-limit">Monthly limit ({currency})</Label>
            <Input
              id="budget-limit"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 20000"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              required
            />
            <p className="text-[11px] leading-relaxed text-slate-400">
              You will see a warning at 80% utilisation and an alert at 100%.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget-month">Month</Label>
              <Select
                id="budget-month"
                value={String(month)}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {MONTHS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-year">Year</Label>
              <Input
                id="budget-year"
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {budget ? "Save changes" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
