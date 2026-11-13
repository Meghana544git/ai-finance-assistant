import { Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { getApiError } from "@/services/api";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checks = useMemo(
    () => [
      { label: "At least 8 characters", passed: password.length >= 8 },
      { label: "Contains a letter and a number", passed: /[a-zA-Z]/.test(password) && /\d/.test(password) },
      { label: "Passwords match", passed: password.length > 0 && password === confirmPassword },
    ],
    [password, confirmPassword],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!checks[0].passed || !checks[1].passed) {
      setError("Choose a password with at least 8 characters, including a letter and a number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(fullName.trim(), email.trim(), password);
      toast.success("Account created. Welcome aboard!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your money in minutes. No card, no paid API, no external bank connection."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <ErrorState message={error} compact />}

        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <div className="relative">
            <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Aarav Sharma"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pl-10 pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>

        <div className="rounded-xl border border-border bg-slate-50/70 p-3.5">
          <ul className="space-y-1.5">
            {checks.map((check) => (
              <li
                key={check.label}
                className={`flex items-center gap-2 text-xs ${
                  check.passed ? "text-emerald-700" : "text-slate-400"
                }`}
              >
                <Check className={`h-3.5 w-3.5 ${check.passed ? "text-emerald-600" : "text-slate-300"}`} />
                {check.label}
              </li>
            ))}
          </ul>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-slate-400">
          By creating an account you acknowledge that this is an educational project, not a
          regulated financial service.
        </p>
      </form>
    </AuthLayout>
  );
}
