import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  ReceiptText,
  Settings,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/budgets", label: "Budgets", icon: Wallet },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/insights", label: "AI Insights", icon: Sparkles },
  { to: "/predictions", label: "Predictions", icon: TrendingUp },
  { to: "/assistant", label: "Assistant", icon: MessageSquareText },
  { to: "/profile", label: "Profile", icon: Settings },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out. Your data stays safe.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <NavLink to="/dashboard" onClick={onNavigate} aria-label="Dashboard home">
          <Logo />
        </NavLink>
        {onNavigate && (
          <Button variant="ghost" size="icon" onClick={onNavigate} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main navigation">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) => cn("nav-link", isActive && "nav-link-active")}
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 p-4">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="mb-1.5 flex items-center gap-2 text-emerald-800">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wide">Learning project</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Educational finance tool. Not professional financial, investment or tax advice.
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-500 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
