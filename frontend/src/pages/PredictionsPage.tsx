import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Database,
  Gauge,
  LineChart,
  RefreshCw,
  ShieldQuestion,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/services/api";
import { mlService } from "@/services/ml.service";
import type { EvaluationResponse, ModelInfo, SpendingForecast } from "@/types";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateTime,
  formatPercent,
  monthKeyToLabel,
} from "@/utils/format";

export function PredictionsPage() {
  const { currency } = useAuth();
  const [forecast, setForecast] = useState<SpendingForecast | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [forecastData, infoData, evaluationData] = await Promise.all([
        mlService.predictSpending(),
        mlService.modelInfo(),
        mlService.evaluation(),
      ]);
      setForecast(forecastData);
      setModelInfo(infoData);
      setEvaluation(evaluationData);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const chartData = (forecast?.history ?? []).map((point) => ({
    label: monthKeyToLabel(point.month),
    actual: point.amount,
    forecast: null as number | null,
  }));
  if (forecast?.status === "ok" && forecast.prediction_month && forecast.predicted_amount !== null) {
    chartData.push({
      label: monthKeyToLabel(forecast.prediction_month),
      actual: null as unknown as number,
      forecast: forecast.predicted_amount,
    });
  }
  const lastActualIndex = (forecast?.history.length ?? 0) - 1;
  const minMonths = forecast?.min_months_required ?? 4;
  const monthsUsed = forecast?.months_used ?? 0;
  const progress = Math.min((monthsUsed / minMonths) * 100, 100);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Machine learning"
        title="Spending prediction"
        description="A Linear Regression model estimates next month's total expenses using only your monthly expense history."
        actions={
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Recalculate
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading || !forecast ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[160px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[380px] rounded-2xl" />
        </div>
      ) : (
        <>
          {forecast.status === "insufficient_data" ? (
            <Card className="border-amber-100 bg-gradient-to-br from-amber-50/70 to-white">
              <CardContent className="p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-navy-900">Not enough monthly history yet</p>
                      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{forecast.message}</p>
                      <div className="mt-4 max-w-sm">
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Months with expense records</span>
                          <span>
                            {monthsUsed} / {minMonths}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2.5" indicatorClassName="bg-amber-500" />
                      </div>
                      <Button asChild size="sm" className="mt-5">
                        <Link to="/transactions?add=1">
                          Record an expense <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-white/80 p-4 text-[11px] leading-relaxed text-amber-800 md:max-w-[260px]">
                    <p className="mb-1 flex items-center gap-1.5 font-bold">
                      <ShieldQuestion className="h-3.5 w-3.5" /> Why the limit?
                    </p>
                    A trend line fitted to fewer than four months is too unstable to present as a
                    meaningful forecast. The app deliberately refuses to guess rather than invent
                    a prediction.
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="relative overflow-hidden border-0 bg-navy-900 text-white lg:col-span-1">
                <div className="hero-grid absolute inset-0" />
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-2xl" />
                <CardContent className="relative p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                      Next month estimate
                    </span>
                    <Badge className="border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">ML</Badge>
                  </div>
                  <p className="mt-3 text-[13px] font-medium text-slate-400">
                    {forecast.prediction_month ? monthKeyToLabel(forecast.prediction_month) : "Next month"}
                  </p>
                  <p className="mt-1 text-[34px] font-extrabold leading-none tracking-tight">
                    {formatCurrency(forecast.predicted_amount, currency)}
                  </p>
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                    Likely range {formatCurrency(forecast.lower_bound, currency)} –{" "}
                    {formatCurrency(forecast.upper_bound, currency)}
                  </p>
                  <div className="mt-5 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[10px] text-slate-400">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    Based on {forecast.months_used} months of your expenses
                  </div>
                </CardContent>
              </Card>

              <StatCard
                label="Mean absolute error"
                value={forecast.mae !== null ? formatCurrency(forecast.mae, currency) : "—"}
                icon={Gauge}
                tone="violet"
                hint="Average size of one-step forecast errors in walk-forward validation"
              />
              <StatCard
                label="Root mean squared error"
                value={forecast.rmse !== null ? formatCurrency(forecast.rmse, currency) : "—"}
                icon={LineChart}
                tone="amber"
                hint="Penalises larger misses more heavily than MAE"
              />
            </div>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Historical vs predicted spending</CardTitle>
                <p className="mt-1 text-xs text-slate-400">
                  Solid bars are recorded months · outlined bar is the estimate
                </p>
              </div>
              <Badge variant="outline" className="gap-1.5">
                <BrainCircuit className="h-3 w-3 text-violet-500" /> {forecast.model_name}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              {chartData.length === 0 ? (
                <EmptyState
                  icon={LineChart}
                  title="No expense history yet"
                  description="Add expenses over a few months and the historical chart will fill in automatically."
                  className="border-0 py-10"
                  action={
                    <Button asChild size="sm">
                      <Link to="/transactions?add=1">Add an expense</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f5" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} dy={8} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={64}
                        tickFormatter={(value: number) => formatCompactCurrency(value, currency)}
                      />
                      <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "#f8fafc" }} />
                      <Bar dataKey="actual" name="Actual spending" radius={[5, 5, 0, 0]} maxBarSize={34}>
                        {chartData.map((_, index) => (
                          <Cell key={index} fill={index === lastActualIndex ? "#0b1f3a" : "#cbd5e1"} />
                        ))}
                      </Bar>
                      <Bar dataKey="forecast" name="Predicted spending" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-slate-300" /> Recorded months
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-navy-900" /> Latest recorded month
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Estimate
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <LineChart className="h-4 w-4" />
                  </div>
                  <CardTitle>How the forecaster works</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed text-slate-500">
                <p>
                  Your expense transactions are aggregated into continuous monthly totals. An
                  ordinary least-squares <span className="font-semibold text-navy-900">Linear Regression</span>{" "}
                  fits a trend across those months and extrapolates one month ahead.
                </p>
                <p>
                  Accuracy is estimated with <span className="font-semibold text-navy-900">walk-forward validation</span>:
                  the model is repeatedly trained only on earlier months and tested on the next
                  unseen month. Reported MAE and RMSE come from those holdout predictions.
                </p>
                <div className="rounded-xl border border-border bg-slate-50/70 p-3">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-600">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Limitations
                  </p>
                  <ul className="mt-1.5 list-inside list-disc space-y-1 text-[11px]">
                    <li>One-off purchases and seasonal festivals can distort a simple trend.</li>
                    <li>A linear model cannot understand salary changes or new recurring bills.</li>
                    <li>Correlation over a few months is not a guarantee of future spending.</li>
                    <li>The range is a heuristic based on historical residuals, not a formal confidence interval.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <BrainCircuit className="h-4 w-4" />
                    </div>
                    <CardTitle>Classifier transparency</CardTitle>
                  </div>
                  {modelInfo && (
                    <Badge variant={modelInfo.artifact_available ? "success" : "danger"}>
                      {modelInfo.artifact_available ? "Model loaded" : "Not trained"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {modelInfo ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Test accuracy</p>
                        <p className="mt-0.5 text-lg font-bold text-navy-900">
                          {modelInfo.accuracy !== null ? formatPercent(modelInfo.accuracy * 100) : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Macro F1</p>
                        <p className="mt-0.5 text-lg font-bold text-navy-900">
                          {modelInfo.macro_f1 !== null ? modelInfo.macro_f1.toFixed(3) : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-slate-500">
                      <p className="flex items-center gap-1.5">
                        <Database className="h-3 w-3 text-slate-400" /> Dataset:{" "}
                        <span className="font-medium text-navy-900">{modelInfo.dataset_size ?? "—"} labelled examples</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-slate-400" /> Trained:{" "}
                        <span className="font-medium text-navy-900">
                          {modelInfo.trained_at ? formatDateTime(modelInfo.trained_at) : "—"}
                        </span>
                      </p>
                      <p className="text-[10px] leading-relaxed text-slate-400">{modelInfo.algorithm}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Model information is unavailable.</p>
                )}

                {evaluation?.available && Object.keys(evaluation.per_class).length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-slate-50 text-slate-400">
                        <tr>
                          <th className="px-2 py-1.5 font-semibold">Category</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Precision</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Recall</th>
                          <th className="px-2 py-1.5 text-right font-semibold">F1</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {Object.entries(evaluation.per_class).map(([label, metrics]) => (
                          <tr key={label}>
                            <td className="px-2 py-1.5 font-medium text-navy-900">{label}</td>
                            <td className="px-2 py-1.5 text-right text-slate-500">{metrics.precision.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right text-slate-500">{metrics.recall.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right text-slate-500">{metrics.f1_score.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-400">
                    {evaluation?.message ??
                      "Run 'python ml/train_model.py' in the backend folder to produce evaluation metrics."}
                  </p>
                )}
                <p className="text-[10px] leading-relaxed text-slate-400">
                  Classifier metrics are measured on held-out data during training. They do not
                  describe forecast accuracy — the forecaster is evaluated separately above.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-[11px] leading-relaxed text-amber-800">
            <span className="font-bold">Prediction disclaimer:</span> {forecast.message} This is an
            educational statistical estimate from your own records, not financial advice.
          </div>
        </>
      )}
    </div>
  );
}
