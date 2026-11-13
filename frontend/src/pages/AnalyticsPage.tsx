import { BarChart3, TrendingUp, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/services/api";
import { dashboardService } from "@/services/dashboard.service";
import type { CategoryBreakdownResponse, MonthlyTrend } from "@/types";
import { categoryColor } from "@/utils/categories";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/utils/format";

const RANGES = [3, 6, 12, 24];

export function AnalyticsPage() {
  const { currency } = useAuth();
  const today = new Date();
  const [months, setMonths] = useState(6);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendsData, breakdownData] = await Promise.all([
        dashboardService.trends(months),
        dashboardService.categoryBreakdown(month, year),
      ]);
      setTrends(trendsData.trends);
      setBreakdown(breakdownData);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [months, month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const income = trends.reduce((sum, point) => sum + point.income, 0);
    const expenses = trends.reduce((sum, point) => sum + point.expenses, 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    const averageSpend = trends.length > 0 ? expenses / trends.length : 0;
    return { income, expenses, savings, savingsRate, averageSpend };
  }, [trends]);

  const pieData = breakdown?.items ?? [];
  const hasData = trends.some((point) => point.income > 0 || point.expenses > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Explore income, expenses, savings and category patterns over time. Every value comes from your saved transactions."
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1 shadow-sm">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setMonths(range)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  months === range
                    ? "bg-navy-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
                }`}
              >
                {range}M
              </button>
            ))}
          </div>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[118px] rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-[360px] rounded-2xl" />
            <Skeleton className="h-[360px] rounded-2xl" />
          </div>
          <Skeleton className="h-[320px] rounded-2xl" />
        </div>
      ) : !hasData ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={BarChart3}
              title="No analytics yet"
              description="Add transactions to your ledger and this page will build itself. Charts are never filled with sample numbers."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={`Income · ${months}M`}
              value={formatCurrency(totals.income, currency)}
              icon={TrendingUp}
              tone="emerald"
              hint={`Across the last ${months} months`}
            />
            <StatCard
              label={`Expenses · ${months}M`}
              value={formatCurrency(totals.expenses, currency)}
              icon={Wallet}
              tone="rose"
              hint={`Average ${formatCurrency(totals.averageSpend, currency)} per month`}
            />
            <StatCard
              label={`Savings · ${months}M`}
              value={formatCurrency(totals.savings, currency)}
              icon={TrendingUp}
              tone={totals.savings >= 0 ? "navy" : "rose"}
              hint="Income minus expenses in this range"
            />
            <StatCard
              label="Savings rate"
              value={formatPercent(totals.savingsRate)}
              icon={BarChart3}
              tone="violet"
              hint="Percentage of income kept"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Income vs expenses</CardTitle>
                    <p className="mt-1 text-xs text-slate-400">Monthly comparison</p>
                  </div>
                  <Badge variant="outline">Last {months} months</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f5" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} dy={8} interval="preserveStartEnd" />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value: number) => formatCompactCurrency(value, currency)}
                        width={64}
                      />
                      <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "#f8fafc" }} />
                      <Legend
                        iconType="circle"
                        iconSize={7}
                        wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                        formatter={(value) => <span className="text-slate-500">{value}</span>}
                      />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Bar dataKey="expenses" name="Expenses" fill="#0b1f3a" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div>
                  <CardTitle>Savings trend</CardTitle>
                  <p className="mt-1 text-xs text-slate-400">What remains after expenses each month</p>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f5" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} dy={8} interval="preserveStartEnd" />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value: number) => formatCompactCurrency(value, currency)}
                        width={64}
                      />
                      <Tooltip content={<ChartTooltip currency={currency} />} />
                      <Area
                        type="monotone"
                        dataKey="savings"
                        name="Savings"
                        stroke="#10b981"
                        strokeWidth={2.4}
                        fill="url(#savingsGradient)"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Category spending</CardTitle>
                  <p className="mt-1 text-xs text-slate-400">Expense distribution for the selected month</p>
                </div>
                <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
              </CardHeader>
              <CardContent className="pt-2">
                {pieData.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No expenses in this month"
                    description="Choose another month or record an expense to see the breakdown."
                    className="border-0 py-10"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData.map((item) => ({ name: item.category, value: item.amount }))}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={62}
                            outerRadius={95}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {pieData.map((item) => (
                              <Cell key={item.category} fill={categoryColor(item.category)} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip currency={currency} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {pieData.map((item) => (
                        <div key={item.category} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(item.category) }} />
                          <span className="truncate text-[11px] font-medium text-slate-600">{item.category}</span>
                          <span className="ml-auto text-[11px] font-bold text-navy-900">{formatPercent(item.percentage)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Category detail</CardTitle>
                    <p className="mt-1 text-xs text-slate-400">
                      {breakdown ? `${breakdown.month}/${breakdown.year}` : ""} · total{" "}
                      {formatCurrency(breakdown?.total_expenses ?? 0, currency)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setMonth(today.getMonth() + 1); setYear(today.getFullYear()); }}>
                    This month
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {pieData.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="Nothing to show"
                    description="No expense transactions for this month."
                    className="border-0 py-10"
                  />
                ) : (
                  <div className="divide-y divide-border/70">
                    {pieData.map((item) => (
                      <div key={item.category} className="flex items-center gap-3 py-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                          style={{ backgroundColor: categoryColor(item.category) }}
                        >
                          {item.category.slice(0, 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-navy-900">{item.category}</p>
                          <p className="text-[10px] text-slate-400">{item.transaction_count} transaction(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-navy-900">{formatCurrency(item.amount, currency)}</p>
                          <p className="text-[10px] text-slate-400">{formatPercent(item.percentage)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 text-[11px] leading-relaxed text-slate-400">
            <span className="font-semibold text-slate-500">How to read this:</span> income and
            expenses are summed by calendar month from your transaction dates. Savings are not a
            bank balance — they are income minus recorded expenses. Categories reflect the final
            label on each expense, including your manual corrections.
          </div>
        </>
      )}
    </div>
  );
}
