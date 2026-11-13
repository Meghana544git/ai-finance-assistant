import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Pencil,
  Plus,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BudgetFormDialog } from "@/components/BudgetFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/services/api";
import { budgetService } from "@/services/budgets.service";
import type { Budget, BudgetListResponse } from "@/types";
import { CATEGORY_ICONS, categoryColor } from "@/utils/categories";
import { formatCurrency, formatPercent } from "@/utils/format";

function statusVariant(status: string): "success" | "warning" | "danger" | "secondary" {
  if (status === "exceeded") return "danger";
  if (status === "warning") return "warning";
  if (status === "healthy") return "success";
  return "secondary";
}

function progressColor(status: string): string {
  if (status === "exceeded") return "bg-red-500";
  if (status === "warning") return "bg-amber-500";
  return "bg-emerald-500";
}

export function BudgetsPage() {
  const { currency } = useAuth();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [data, setData] = useState<BudgetListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await budgetService.list(month, year);
      setData(response);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await budgetService.remove(deleteTarget.id);
      toast.success("Budget deleted.");
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const budgets = data?.items ?? [];
  const warningCount = budgets.filter((budget) => budget.status === "warning").length;
  const exceededCount = budgets.filter((budget) => budget.status === "exceeded").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Budgets"
        description="Set monthly limits and let the app track every expense against them. Warnings arrive at 80% and alerts at 100%."
        actions={
          <>
            <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New budget
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading || !data ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[118px] rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[220px] rounded-2xl" />
            ))}
          </div>
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Target}
              title="No budgets for this month"
              description="Create an overall monthly cap, or target the categories where you tend to overspend. The app calculates spending automatically."
              action={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Create your first budget
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total budget"
              value={formatCurrency(data.total_limit, currency)}
              icon={Wallet}
              tone="navy"
              hint={`${budgets.length} budget(s) active this month`}
            />
            <StatCard
              label="Budget spent"
              value={formatCurrency(data.total_spent, currency)}
              icon={Target}
              tone="amber"
              hint="Tracked from actual expense transactions"
            />
            <StatCard
              label="Overall utilisation"
              value={formatPercent(data.overall_utilization)}
              icon={CalendarRange}
              tone={data.overall_utilization >= 100 ? "rose" : "emerald"}
              hint={data.overall_utilization >= 80 ? "Review your largest categories" : "You are within a comfortable range"}
            />
            <StatCard
              label="Budget health"
              value={exceededCount > 0 ? `${exceededCount} exceeded` : warningCount > 0 ? `${warningCount} warning` : "On track"}
              icon={exceededCount > 0 ? AlertTriangle : CheckCircle2}
              tone={exceededCount > 0 ? "rose" : warningCount > 0 ? "amber" : "emerald"}
              hint={`${budgets.length - warningCount - exceededCount} budget(s) healthy`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => {
              const CategoryIcon = budget.category ? CATEGORY_ICONS[budget.category] ?? Target : Wallet;
              const color = budget.category ? categoryColor(budget.category) : "#0b1f3a";
              return (
                <Card key={budget.id} className="transition-shadow hover:shadow-lift">
                  <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${color}14`, color }}
                      >
                        <CategoryIcon className="h-[18px] w-[18px]" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{budget.category ?? "Overall budget"}</CardTitle>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {budget.category ? "Category limit" : "All expenses"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusVariant(budget.status)}>
                      {budget.status === "exceeded" ? "Exceeded" : budget.status === "warning" ? "Near limit" : "Healthy"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold text-navy-900">
                          {formatCurrency(budget.spent, currency)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          of {formatCurrency(budget.monthly_limit, currency)}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          budget.status === "exceeded"
                            ? "text-red-600"
                            : budget.status === "warning"
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }`}
                      >
                        {formatPercent(budget.utilization)}
                      </span>
                    </div>
                    <Progress
                      value={budget.utilization}
                      className="mt-3 h-2.5"
                      indicatorClassName={progressColor(budget.status)}
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <p className={`text-xs ${budget.remaining < 0 ? "font-semibold text-red-600" : "text-slate-500"}`}>
                        {budget.remaining < 0 ? "Over by " : "Remaining "}
                        {formatCurrency(Math.abs(budget.remaining), currency)}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-navy-900"
                          onClick={() => {
                            setEditing(budget);
                            setDialogOpen(true);
                          }}
                          aria-label="Edit budget"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleteTarget(budget)}
                          aria-label="Delete budget"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {budget.status === "warning" && (
                      <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        You have used 80% or more of this budget.
                      </div>
                    )}
                    {budget.status === "exceeded" && (
                      <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] font-medium text-red-700">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        Limit reached. Review the relevant expenses.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400">
            Spent amounts are computed live from expense transactions dated within{" "}
            {new Date(year, month - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })}.
            An overall budget takes precedence over category budgets on the dashboard.
          </p>
        </>
      )}

      <BudgetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={editing}
        defaultMonth={month}
        defaultYear={year}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this budget?"
        description={
          deleteTarget
            ? `The ${deleteTarget.category ?? "overall"} budget of ${formatCurrency(
                deleteTarget.monthly_limit,
                currency,
              )} for ${deleteTarget.month}/${deleteTarget.year} will be removed. Transactions are not affected.`
            : ""
        }
        confirmLabel="Delete budget"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
