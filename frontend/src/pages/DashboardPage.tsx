import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Plus,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CategoryBadge } from "@/components/CategoryBadge";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/PageHeader";
import { SeverityIcon } from "@/components/InsightSeverity";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/services/api";
import { dashboardService } from "@/services/dashboard.service";
import { insightService } from "@/services/insights.service";
import { transactionService } from "@/services/transactions.service";
import type {
  CategoryBreakdownResponse,
  DashboardSummary,
  InsightsResponse,
  MonthlyTrend,
  Transaction,
} from "@/types";
import { categoryColor } from "@/utils/categories";
import { formatCompactCurrency, formatCurrency, formatDate, formatPercent } from "@/utils/format";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function statusTone(status: string): "success" | "warning" | "danger" | "secondary" {
  if (status === "exceeded") return "danger";
  if (status === "warning") return "warning";
  if (status === "healthy") return "success";
  return "secondary";
}

export function DashboardPage() {
  const { user, currency } = useAuth();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownResponse | null>(null);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, breakdownData, trendsData, insightsData, recentData] = await Promise.all([
        dashboardService.summary(month, year),
        dashboardService.categoryBreakdown(month, year),
        dashboardService.trends(6),
        insightService.list(month, year),
        transactionService.list({ page: 1, page_size: 5, sort_by: "transaction_date", sort_order: "desc" }),
      ]);
      setSummary(summaryData);
      setBreakdown(breakdownData);
      setTrends(trendsData.trends);
      setInsights(insightsData);
      setRecent(recentData.items);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const pieData = (breakdown?.items ?? []).map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={summary?.period_label ?? "Overview"}
        title={`${greeting()}, ${user?.full_name.split(" ")[0] ?? "there"} 👋`}
        description="Here is what is happening with your money this month — calculated entirely from your saved transactions."
        actions={
          <>
            <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
            <Button asChild>
              <Link to="/transactions?add=1">
                <Plus className="h-4 w-4" /> Add transaction
              </Link>
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading || !summary ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total income"
              value={formatCurrency(summary.total_income, currency)}
              icon={ArrowDownLeft}
              tone="emerald"
              hint={`${summary.transaction_count} transaction(s) recorded this month`}
            />
            <StatCard
              label="Total expenses"
              value={formatCurrency(summary.total_expenses, currency)}
              icon={ArrowUpRight}
              tone="rose"
              hint={summary.top_category ? `Highest: ${summary.top_category}` : "No expenses recorded yet"}
            />
            <StatCard
              label="Current balance"
              value={formatCurrency(summary.total_balance, currency)}
              icon={Wallet}
              tone="navy"
              hint="All-time income minus expenses"
            />
            <StatCard
              label="Savings rate"
              value={formatPercent(summary.savings_rate)}
              icon={summary.net_savings >= 0 ? TrendingUp : TrendingDown}
              tone={summary.net_savings >= 0 ? "emerald" : "rose"}
              hint={`${formatCurrency(summary.net_savings, currency)} saved this month`}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Income vs expenses</CardTitle>
                  <p className="mt-1 text-xs text-slate-400">Last six calendar months</p>
                </div>
                <Badge variant="outline" className="gap-1.5">
                  <BarChart3 className="h-3 w-3 text-emerald-600" /> Monthly
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0b1f3a" stopOpacity={0.14} />
                          <stop offset="100%" stopColor="#0b1f3a" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f5" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} dy={8} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value: number) => formatCompactCurrency(value, currency)}
                        width={62}
                      />
                      <Tooltip content={<ChartTooltip currency={currency} />} />
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#10b981"
                        strokeWidth={2.4}
                        fill="url(#incomeGradient)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#0b1f3a"
                        strokeWidth={2.2}
                        fill="url(#expenseGradient)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex items-center gap-5 px-1">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Income
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-navy-900" /> Expenses
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Expense categories</CardTitle>
                <p className="mt-1 text-xs text-slate-400">{summary.period_label}</p>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <EmptyState
                    icon={ReceiptText}
                    title="No expenses yet"
                    description="Add your first expense this month to see the category split."
                    className="border-0 bg-transparent py-8"
                    action={
                      <Button asChild size="sm">
                        <Link to="/transactions?add=1">Add expense</Link>
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <div className="relative mx-auto h-[190px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={58}
                            outerRadius={82}
                            paddingAngle={3}
                            strokeWidth={0}
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={categoryColor(entry.name)} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip currency={currency} />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
                        <p className="text-lg font-bold text-navy-900">
                          {formatCompactCurrency(breakdown?.total_expenses ?? 0, currency)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {pieData.slice(0, 5).map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: categoryColor(entry.name) }}
                            />
                            <span className="truncate">{entry.name}</span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-navy-900">
                            {formatPercent(entry.percentage)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Monthly budget</CardTitle>
                  <Badge variant={statusTone(summary.budget_status)}>
                    {summary.budget_status === "none" ? "Not set" : summary.budget_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {summary.budget_limit === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-slate-50/60 p-5 text-center">
                    <p className="text-sm font-semibold text-navy-900">No budget for this month</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Set a monthly limit to track utilization and receive 80%/100% alerts.
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link to="/budgets">
                        <Wallet className="h-3.5 w-3.5" /> Create budget
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-navy-900">
                          {formatCurrency(summary.budget_spent, currency)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          of {formatCurrency(summary.budget_limit, currency)} limit
                        </p>
                      </div>
                      <span className="text-sm font-bold text-navy-900">
                        {formatPercent(summary.budget_utilization)}
                      </span>
                    </div>
                    <Progress
                      value={summary.budget_utilization}
                      className="mt-4 h-2.5"
                      indicatorClassName={
                        summary.budget_status === "exceeded"
                          ? "bg-red-500"
                          : summary.budget_status === "warning"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }
                    />
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className={summary.budget_remaining < 0 ? "font-semibold text-red-600" : "text-slate-500"}>
                        {summary.budget_remaining < 0 ? "Over budget by " : "Remaining "}
                        {formatCurrency(Math.abs(summary.budget_remaining), currency)}
                      </span>
                      <Link to="/budgets" className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        Manage <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    {summary.budget_status === "warning" && (
                      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-700">
                        You have used over 80% of this month's budget.
                      </p>
                    )}
                    {summary.budget_status === "exceeded" && (
                      <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-red-700">
                        Budget exceeded. Review your highest spending categories.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle>Personalised insights</CardTitle>
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Sparkles className="h-2.5 w-2.5" /> Rule-based
                  </Badge>
                </div>
                <Link to="/insights" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights?.insights.length ? (
                  insights.insights.slice(0, 3).map((insight, index) => (
                    <div
                      key={`${insight.insight_type}-${index}`}
                      className="flex items-start gap-3 rounded-xl border border-border/70 bg-white p-3.5"
                    >
                      <SeverityIcon severity={insight.severity} className="h-9 w-9" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-900">{insight.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Sparkles}
                    title="Insights will appear here"
                    description="Add a few transactions to unlock personalised observations."
                    className="border-0 py-8"
                  />
                )}
                <p className="px-1 text-[10px] leading-relaxed text-slate-400">
                  Generated by transparent rules from your records, not by a language model.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Recent transactions</CardTitle>
                <p className="mt-1 text-xs text-slate-400">Your five latest entries</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/transactions">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <EmptyState
                  icon={ReceiptText}
                  title="No transactions yet"
                  description="Add your first income or expense to start building your financial picture."
                  action={
                    <Button asChild size="sm">
                      <Link to="/transactions?add=1">
                        <Plus className="h-3.5 w-3.5" /> Add transaction
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="divide-y divide-border/70">
                  {recent.map((transaction) => {
                    const isIncome = transaction.transaction_type === "income";
                    return (
                      <div key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isIncome ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-navy-900">{transaction.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-slate-400">
                                {formatDate(transaction.transaction_date)}
                              </span>
                              {!isIncome && (
                                <CategoryBadge category={transaction.category} source={transaction.category_source} />
                              )}
                              {isIncome && <Badge variant="success">Income</Badge>}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-sm font-bold ${
                            isIncome ? "text-emerald-600" : "text-navy-900"
                          }`}
                        >
                          {isIncome ? "+" : "−"}
                          {formatCurrency(transaction.amount, currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[118px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-[400px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-[260px] rounded-2xl" />
        <Skeleton className="h-[260px] rounded-2xl xl:col-span-2" />
      </div>
    </div>
  );
}
