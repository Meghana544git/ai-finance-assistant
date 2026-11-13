import { CheckCircle2, Quote, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/Logo";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-[46%] overflow-hidden bg-navy-900 lg:flex lg:flex-col">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
          <Link to="/" aria-label="Back to home">
            <Logo variant="light" />
          </Link>

          <div className="mt-auto max-w-md">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
              <Sparkles className="h-3 w-3" /> Your money, explained
            </div>
            <h2 className="text-balance text-3xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-[38px]">
              Clarity beats guesswork when it comes to money.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              One workspace for your transactions, budgets, analytics and honest machine-learning
              predictions — built with your own data.
            </p>

            <div className="mt-8 space-y-3.5">
              {[
                "Real-time dashboard from your recorded transactions",
                "ML category suggestions you can always correct",
                "Budgets with 80% warnings and 100% alerts",
                "Predictions that clearly state their limits",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <Quote className="h-5 w-5 text-emerald-400/60" />
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                "The forecast told me my Food spending was trending 18% higher — and it was
                right. Seeing it before the month ended made the difference."
              </p>
              <p className="mt-3 text-[11px] font-semibold text-slate-400">
                Illustrative student user · not a real testimonial
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2 pt-10 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            JWT authentication · hashed passwords · per-user data isolation
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col lg:w-[54%]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 lg:hidden">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/" className="text-xs font-semibold text-slate-500">
            Back to home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[420px] animate-fade-up">
            <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-[28px]">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
