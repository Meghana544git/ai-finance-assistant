import type { Budget, BudgetListResponse, BudgetPayload } from "@/types";
import { api } from "./api";

export const budgetService = {
  async list(month?: number, year?: number): Promise<BudgetListResponse> {
    const params = month && year ? { month, year } : undefined;
    const { data } = await api.get<BudgetListResponse>("/budgets", { params });
    return data;
  },
  async create(payload: BudgetPayload): Promise<Budget> {
    const { data } = await api.post<Budget>("/budgets", payload);
    return data;
  },
  async update(id: number, payload: Partial<BudgetPayload>): Promise<Budget> {
    const { data } = await api.put<Budget>(`/budgets/${id}`, payload);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/budgets/${id}`);
  },
};
