import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ProtectedRoute, PublicOnlyRoute } from "@/components/RouteGuards";
import { AppLayout } from "@/layouts/AppLayout";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AssistantPage } from "@/pages/AssistantPage";
import { BudgetsPage } from "@/pages/BudgetsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { InsightsPage } from "@/pages/InsightsPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PredictionsPage } from "@/pages/PredictionsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { TransactionsPage } from "@/pages/TransactionsPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
