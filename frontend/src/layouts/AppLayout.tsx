import { Bell, ChevronDown, LogOut, Menu, MessageSquareText, Settings, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { SidebarContent } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { formatDate, initials } from "@/utils/format";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transactions",
  "/budgets": "Budgets",
  "/analytics": "Analytics",
  "/insights": "AI Insights",
  "/predictions": "Spending Prediction",
  "/assistant": "Finance Assistant",
  "/profile": "Profile & Settings",
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = PAGE_TITLES[location.pathname] ?? "AI Finance Assistant";

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border bg-white lg:block">
        <SidebarContent />
      </aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="left-0 top-0 h-full max-w-[290px] translate-x-0 translate-y-0 rounded-none border-0 p-0 data-[state=open]:slide-in-from-left">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-navy-900 sm:text-lg">{title}</h1>
                <p className="hidden text-xs text-slate-400 sm:block">
                  {formatDate(new Date().toISOString())} · Your personal finance workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden gap-1.5 rounded-full sm:inline-flex"
              >
                <Link to="/assistant">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  Ask assistant
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative hidden sm:inline-flex"
                aria-label="Open assistant"
              >
                <Link to="/assistant">
                  <MessageSquareText className="h-[18px] w-[18px]" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Notifications">
                <Bell className="h-[18px] w-[18px]" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-2.5 shadow-sm transition-colors hover:bg-slate-50 focus-ring"
                    aria-label="Open user menu"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                      {initials(user?.full_name ?? "User")}
                    </span>
                    <span className="hidden max-w-[110px] truncate text-xs font-semibold text-navy-900 sm:block">
                      {user?.full_name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
                  <div className="px-2.5 pb-2">
                    <p className="truncate text-sm font-semibold text-navy-900">{user?.full_name}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <Settings className="h-4 w-4" /> Profile &amp; settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/assistant">
                      <MessageSquareText className="h-4 w-4" /> Finance assistant
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:bg-red-50 focus:text-red-700"
                    onSelect={handleLogout}
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
