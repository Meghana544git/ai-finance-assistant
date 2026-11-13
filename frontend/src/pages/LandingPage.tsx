import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  LineChart,
  LockKeyhole,
  MessageSquareText,
  PieChart,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  {
    icon: Wallet,
    title: "Transactions that stay organised",
    description:
      "Record income and expenses, search instantly, filter by category or date, and export everything to CSV.",
  },
  {
    icon: BrainCircuit,
    title: "ML expense categorisation",
    description:
      "A TF-IDF + Logistic Regression classifier suggests a category from the transaction text. You always have the final say.",
  },
  {
    icon: Target,
    title: "Budgets with real guardrails",
    description:
      "Set overall or category monthly limits. See spent and remaining amounts, with warnings at 80% and alerts at 100%.",
  },
  {
    icon: BarChart3,
    title: "Analytics you can read",
    description:
      "Income versus expenses, category breakdowns and savings trends rendered as clean, interactive charts.",
  },
  {
    icon: LineChart,
    title: "Next-month forecasting",
    description:
      "Linear Regression estimates next month's spending from your own history, with honest accuracy metrics and data limits.",
  },
  {
    icon: MessageSquareText,
    title: "Local finance assistant",
    description:
      "Ask about this month's spending, budgets or recent transactions. A rule-based engine answers from your saved records only.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Create your account",
    description: "Register with an email and password. Your financial records are isolated to you.",
  },
  {
    number: "02",
    title: "Add income and expenses",
    description: "Log a transaction in seconds. The classifier suggests a category as you type.",
  },
  {
    number: "03",
    title: "Set monthly budgets",
    description: "Create an overall spending cap or target specific categories that matter to you.",
  },
  {
    number: "04",
    title: "Review, predict, improve",
    description: "Explore analytics and insights, then check the forecast before the month begins.",
  },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="AI Finance Assistant home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-500 md:flex">
            <a href="#features" className="transition-colors hover:text-navy-900">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-navy-900">
              How it works
            </a>
            <a href="#machine-learning" className="transition-colors hover:text-navy-900">
              Machine learning
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button asChild size="sm">
                <Link to="/dashboard">
                  Open dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative z-10 animate-fade-up">
            <Badge className="mb-5 gap-1.5 border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              <Sparkles className="h-3 w-3" /> B.Tech AI &amp; ML project · Fully local ML
            </Badge>
            <h1 className="text-balance text-[38px] font-extrabold leading-[1.08] tracking-tight text-navy-900 sm:text-[54px]">
              Understand your money{" "}
              <span className="relative whitespace-nowrap text-emerald-600">
                before it moves.
                <svg
                  viewBox="0 0 300 12"
                  className="absolute -bottom-1 left-0 w-full text-emerald-200"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M2 9C70 2 180 2 298 8" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
              Track income and expenses, categorise spending with machine learning, build
              budgets, and forecast next month — in one focused personal finance workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="group">
                <Link to={isAuthenticated ? "/dashboard" : "/register"}>
                  {isAuthenticated ? "Go to dashboard" : "Create free account"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Sign in to your account</Link>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No paid AI API
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Your data, isolated per user
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Runs on Windows locally
              </span>
            </div>
          </div>

          {/* Product preview */}
          <div className="relative z-10 animate-fade-up animate-delay-200">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-100/70 blur-2xl" />
            <div className="relative rounded-3xl border border-slate-200 bg-white p-2.5 shadow-[0_30px_80px_-30px_rgba(11,31,58,0.35)]">
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-background">
                <div className="flex items-center justify-between bg-navy-900 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-semibold text-white/80">Monthly overview</span>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                    Live data
                  </span>
                </div>
                <div className="space-y-3 p-3.5">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Income", value: "₹64,000", tone: "text-emerald-600" },
                      { label: "Expenses", value: "₹38,240", tone: "text-navy-900" },
                      { label: "Saved", value: "40.2%", tone: "text-navy-900" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl border border-border bg-white p-2.5">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                          {stat.label}
                        </p>
                        <p className={`mt-1 text-sm font-bold ${stat.tone}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-500">Income vs expenses</span>
                      <span className="text-[9px] text-slate-400">Last 6 months</span>
                    </div>
                    <div className="flex h-[92px] items-end gap-2">
                      {[52, 66, 48, 74, 60, 88, 70, 96, 78, 62, 84, 58].map((height, index) => (
                        <div key={index} className="flex flex-1 items-end gap-0.5">
                          <div
                            className="w-1/2 rounded-t-[2px] bg-emerald-200"
                            style={{ height: `${Math.max(height - 18, 16)}%` }}
                          />
                          <div
                            className={`w-1/2 rounded-t-[2px] ${index === 9 ? "bg-emerald-500" : "bg-navy-800/80"}`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-500">Recent activity</span>
                      <span className="text-[9px] font-medium text-emerald-600">View all</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { title: "Swiggy order", meta: "Food · AI", amount: "−₹480", tone: "text-navy-900" },
                        { title: "Monthly salary", meta: "Income", amount: "+₹64,000", tone: "text-emerald-600" },
                        { title: "Metro recharge", meta: "Transport", amount: "−₹200", tone: "text-navy-900" },
                      ].map((row) => (
                        <div key={row.title} className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-6 w-6 shrink-0 rounded-lg bg-slate-100" />
                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-semibold text-navy-900">{row.title}</p>
                              <p className="text-[8px] text-slate-400">{row.meta}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold ${row.tone}`}>{row.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 max-w-[210px] rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-lift sm:-left-8">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Forecast</p>
                  <p className="text-[11px] font-bold text-navy-900">Next month ≈ ₹35,100</p>
                </div>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-slate-400">
                Linear regression estimate from 6 months of your own records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-slate-100 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-7 sm:grid-cols-4 sm:px-6">
          {[
            { icon: LockKeyhole, label: "JWT-secured API" },
            { icon: ShieldCheck, label: "User-isolated data" },
            { icon: BrainCircuit, label: "Real Scikit-learn models" },
            { icon: PiggyBank, label: "No subscription fees" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 text-xs font-semibold text-slate-500">
              <item.icon className="h-4 w-4 text-emerald-600" />
              {item.label}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Everything in one place</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            A finance workspace that explains itself
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
            Built around your real transactions — no demo numbers, no hidden magic. Every chart,
            budget and prediction can be traced back to records you entered.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-card"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <feature.icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="text-[15px] font-bold text-navy-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-12 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900">
              Four steps to a clearer month
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-white text-[11px] font-bold text-emerald-700">
                    {step.number}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-emerald-200 to-transparent" />
                </div>
                <h3 className="text-sm font-bold text-navy-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ML section */}
      <section id="machine-learning" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-10 sm:px-10 sm:py-14">
          <div className="hero-grid pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge className="mb-4 border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <BrainCircuit className="h-3 w-3" /> Under the hood
              </Badge>
              <h2 className="text-balance text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Two real machine-learning models. Zero invented numbers.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                The project uses Scikit-learn pipelines trained in Python — one to classify
                expense text, one to forecast monthly totals. Evaluation metrics are produced by
                actual test runs, and the app tells you when there is not enough data.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["TF-IDF", "Logistic Regression", "Linear Regression", "Scikit-learn", "Joblib"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                      <PieChart className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Expense classifier</p>
                      <p className="text-[11px] text-slate-400">Text → one of 8 categories</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                    Supervised
                  </span>
                </div>
                <div className="mt-4 rounded-xl bg-navy-950/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Example</p>
                  <p className="mt-1 text-sm text-slate-200">"Uber cab to airport"</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300">Transport</span>
                    <span className="text-[11px] text-slate-400">high confidence</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300">
                      <LineChart className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Monthly forecaster</p>
                      <p className="text-[11px] text-slate-400">Your expense history → next month</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">
                    Regression
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  {[40, 52, 47, 60, 56, 68, 64, 76].map((height, index) => (
                    <div
                      key={index}
                      className={`flex-1 rounded-t-[3px] ${index === 7 ? "bg-sky-400/80" : "bg-slate-500/40"}`}
                      style={{ height: `${height * 0.55}px` }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  Dashed estimate · blended with MAE / RMSE reporting
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white px-6 py-10 text-center sm:px-10 sm:py-12 lg:flex-row lg:text-left">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
              Start with one transaction today.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Create your account, add this month's expenses, and let the dashboard show you
              where the money actually went.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to={isAuthenticated ? "/dashboard" : "/register"}>
              {isAuthenticated ? "Open dashboard" : "Get started free"} <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-400">
              An educational B.Tech AI &amp; ML project. Not professional financial, investment,
              tax or banking advice. All analytics use records you enter yourself.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-500">
            <a href="#features" className="hover:text-navy-900">Features</a>
            <a href="#machine-learning" className="hover:text-navy-900">Machine learning</a>
            <Link to="/login" className="hover:text-navy-900">Sign in</Link>
            <Link to="/register" className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800">
              Create account <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
