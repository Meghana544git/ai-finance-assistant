import type {
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  TransactionPayload,
} from "@/types";
import { api } from "./api";

export const transactionService = {
  async list(filters: TransactionFilters): Promise<TransactionListResponse> {
    const { data } = await api.get<TransactionListResponse>("/transactions", {
      params: filters,
    });
    return data;
  },
  async create(payload: TransactionPayload): Promise<Transaction> {
    const { data } = await api.post<Transaction>("/transactions", payload);
    return data;
  },
  async update(id: number, payload: Partial<TransactionPayload>): Promise<Transaction> {
    const { data } = await api.put<Transaction>(`/transactions/${id}`, payload);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/transactions/${id}`);
  },
  async exportCsv(): Promise<Blob> {
    const { data } = await api.get("/transactions/export", { responseType: "blob" });
    return data as Blob;
  },
};
