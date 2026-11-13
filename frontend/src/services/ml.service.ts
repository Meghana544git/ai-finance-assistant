import type {
  CategoryPrediction,
  EvaluationResponse,
  HealthResponse,
  ModelInfo,
  SpendingForecast,
} from "@/types";
import { api } from "./api";

export const mlService = {
  async predictCategory(title: string, description?: string): Promise<CategoryPrediction> {
    const { data } = await api.post<CategoryPrediction>("/ml/predict-category", {
      title,
      description: description || null,
    });
    return data;
  },
  async predictSpending(): Promise<SpendingForecast> {
    const { data } = await api.post<SpendingForecast>("/ml/predict-spending");
    return data;
  },
  async modelInfo(): Promise<ModelInfo> {
    const { data } = await api.get<ModelInfo>("/ml/model-info");
    return data;
  },
  async evaluation(): Promise<EvaluationResponse> {
    const { data } = await api.get<EvaluationResponse>("/ml/evaluation");
    return data;
  },
  async health(): Promise<HealthResponse> {
    const base = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ?? "http://localhost:8000";
    const { data } = await api.get<HealthResponse>(`${base}/health`);
    return data;
  },
};
