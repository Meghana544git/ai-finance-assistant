import type {
  CategoryBreakdownResponse,
  DashboardSummary,
  MonthlyTrendsResponse,
} from "@/types";
import { api } from "./api";

export const dashboardService = {
  async summary(month?: number, year?: number): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>("/dashboard/summary", {
      params: month && year ? { month, year } : undefined,
    });
    return data;
  },
  async trends(months = 6): Promise<MonthlyTrendsResponse> {
    const { data } = await api.get<MonthlyTrendsResponse>("/dashboard/monthly-trends", {
      params: { months },
    });
    return data;
  },
  async categoryBreakdown(month?: number, year?: number): Promise<CategoryBreakdownResponse> {
    const { data } = await api.get<CategoryBreakdownResponse>("/dashboard/category-breakdown", {
      params: month && year ? { month, year } : undefined,
    });
    return data;
  },
};
