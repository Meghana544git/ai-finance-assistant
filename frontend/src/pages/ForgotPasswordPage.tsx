import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/layouts/AuthLayout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="A password reset interface is provided, but this educational build does not send email."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      }
    >
      {submitted ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
            <div className="mb-2 flex items-center gap-2 text-amber-700">
              <MailCheck className="h-4 w-4" />
              <p className="text-sm font-semibold">No email was sent</p>
            </div>
            <p className="text-sm leading-relaxed text-amber-800/80">
              This project has no email provider configured. If you registered{" "}
              <span className="font-semibold">{email || "your email"}</span>, you can sign in with
              the password you chose at registration.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Local recovery options</p>
            <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
              <li>1. Try signing in again — passwords are case-sensitive.</li>
              <li>2. If you still cannot access the account, register a new account with a different email.</li>
              <li>
                3. For a self-hosted deployment, an administrator can reset a password directly
                in the database using the backend scripts (never share your JWT secret).
              </li>
            </ol>
          </div>
          <Button asChild className="w-full" size="lg">
            <Link to="/login">Return to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-xs leading-relaxed text-sky-800">
            <p className="mb-1 flex items-center gap-1.5 font-semibold">
              <KeyRound className="h-3.5 w-3.5" /> Honest limitation
            </p>
            This demo has no email service, so it cannot deliver a reset link. Submitting the form
            will explain your local recovery options — it will not pretend an email was sent.
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Registered email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Show recovery options
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
