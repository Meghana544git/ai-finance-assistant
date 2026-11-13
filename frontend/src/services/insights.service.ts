import type { InsightsResponse } from "@/types";
import { api } from "./api";

export const insightService = {
  async list(month?: number, year?: number): Promise<InsightsResponse> {
    const { data } = await api.get<InsightsResponse>("/insights", {
      params: month && year ? { month, year } : undefined,
    });
    return data;
  },
};
