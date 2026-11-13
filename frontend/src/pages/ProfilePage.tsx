import {
  ArrowDownToLine,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Database,
  Loader2,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/services/api";
import { authService } from "@/services/auth.service";
import { mlService } from "@/services/ml.service";
import { tokenStorage } from "@/services/tokenStorage";
import { transactionService } from "@/services/transactions.service";
import type { HealthResponse } from "@/types";
import { CURRENCIES } from "@/utils/categories";
import { formatDate, formatDateTime, initials } from "@/utils/format";

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currency, setCurrency] = useState(user?.preferred_currency ?? "INR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
      setCurrency(user.preferred_currency);
    }
  }, [user]);

  useEffect(() => {
    mlService
      .health()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        preferred_currency: currency,
      });
      updateUser(updated);
      toast.success("Profile updated.");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await transactionService.exportCsv();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Your transactions were exported as CSV.");
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out.");
    navigate("/login", { replace: true });
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") {
      toast.error('Type DELETE exactly to confirm account removal.');
      return;
    }
    setDeleting(true);
    try {
      await authService.deleteAccount();
      tokenStorage.clear();
      window.dispatchEvent(new Event("auth:logout"));
      toast.success("Account deleted. All financial data was removed.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(getApiError(err));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profile & settings"
        description="Manage your account details, preferred currency and data export. Your financial records stay scoped to this account."
        actions={
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Account details</CardTitle>
            <p className="text-xs text-slate-400">Used for signing in and formatting amounts.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {error && <ErrorState message={error} compact />}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full name</Label>
                  <div className="relative">
                    <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="profile-name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="pl-10"
                      maxLength={120}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-currency">Preferred currency</Label>
                  <Select
                    id="profile-currency"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                  >
                    {CURRENCIES.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    New amounts are formatted in this currency. Values are not converted — the app
                    does not fetch exchange rates.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Member since</Label>
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-slate-50 px-3.5 text-sm text-slate-500">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    {user ? formatDate(user.created_at) : "—"}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-navy-900 text-2xl font-extrabold text-white shadow-lift">
                {initials(user?.full_name ?? "User")}
              </div>
              <p className="mt-4 text-base font-bold text-navy-900">{user?.full_name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
              <Badge variant="success" className="mt-3 gap-1">
                <BadgeCheck className="h-3 w-3" /> Active account
              </Badge>
            </div>
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span>Currency</span>
                <span className="font-semibold text-navy-900">{user?.preferred_currency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Account ID</span>
                <span className="font-semibold text-navy-900">#{user?.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last updated</span>
                <span className="font-semibold text-navy-900">
                  {user ? formatDate(user.updated_at) : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> Export your data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs leading-relaxed text-slate-500">
              Download every transaction as a UTF-8 CSV that opens cleanly in Excel. Includes
              dates, amounts, types, categories and notes.
            </p>
            <Button variant="outline" className="w-full" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
              Export transactions to CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[11px] leading-relaxed text-slate-500">
            <p className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              Passwords are hashed with Argon2id — never stored in plain text.
            </p>
            <p className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              Short-lived JWT access tokens plus refresh tokens are stored in this browser only.
            </p>
            <p className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              Every API query is scoped to your user ID on the server.
            </p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-400">
              Signing out clears tokens on this device. JWTs are stateless, so this educational
              build does not maintain a server-side token blocklist.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-emerald-600" /> System status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[11px] text-slate-500">
            {health ? (
              <>
                <div className="flex items-center justify-between">
                  <span>API</span>
                  <Badge variant={health.status === "ok" ? "success" : "warning"}>{health.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Database</span>
                  <span className="font-semibold text-navy-900">
                    {health.database.engine} · {health.database.connected ? "connected" : "offline"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>ML classifier</span>
                  <span className="font-semibold text-navy-900">
                    {health.machine_learning.category_model_available ? "loaded" : "not trained"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Version</span>
                  <span className="font-semibold text-navy-900">{health.version}</span>
                </div>
                <p className="pt-1 text-[10px] text-slate-400">
                  Checked {formatDateTime(health.timestamp)}
                </p>
              </>
            ) : (
              <p className="text-[11px] leading-relaxed text-slate-400">
                Could not load system status. The API may be offline, but your profile data still
                loads from the session.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-100">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-red-700">
            <Trash2 className="h-4 w-4" /> Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-slate-500">
            Deleting your account permanently removes your profile, transactions, budgets,
            insights and forecasts. Export your transactions first if you need a copy.
          </p>
          <Button variant="destructive-outline" className="shrink-0" onClick={() => { setDeleteConfirm(""); setDeleteOpen(true); }}>
            <Trash2 className="h-4 w-4" /> Delete account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => !deleting && setDeleteOpen(open)}
        title="Delete your account permanently?"
        description="This removes your profile and every transaction, budget, insight and prediction tied to it. This action cannot be undone."
        confirmLabel="Delete everything"
        onConfirm={handleDelete}
        loading={deleting}
      >
        <div className="space-y-2">
          <Label htmlFor="delete-confirm">
            Type <span className="font-bold text-red-600">DELETE</span> to confirm
          </Label>
          <Input
            id="delete-confirm"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
