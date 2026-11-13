export type TransactionType = "income" | "expense";

export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Health"
  | "Education"
  | "Other";

export type CategorySource = "manual" | "ml" | "default" | "corrected";

export interface User {
  id: number;
  full_name: string;
  email: string;
  preferred_currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Transaction {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  amount: number;
  transaction_type: TransactionType;
  category: Category | string;
  transaction_date: string;
  notes: string | null;
  category_source: CategorySource | string;
  created_at: string;
  updated_at: string;
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  total_income: number;
  total_expenses: number;
}

export interface TransactionPayload {
  title: string;
  description?: string | null;
  amount: number;
  transaction_type: TransactionType;
  category?: Category | null;
  transaction_date: string;
  notes?: string | null;
  category_source?: CategorySource | null;
}

export interface TransactionFilters {
  search?: string;
  category?: string;
  transaction_type?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export interface Budget {
  id: number;
  user_id: number;
  category: Category | null;
  monthly_limit: number;
  month: number;
  year: number;
  spent: number;
  remaining: number;
  utilization: number;
  status: "healthy" | "warning" | "exceeded" | string;
  created_at: string;
  updated_at: string;
}

export interface BudgetListResponse {
  items: Budget[];
  total_limit: number;
  total_spent: number;
  overall_utilization: number;
}

export interface BudgetPayload {
  category?: Category | null;
  monthly_limit: number;
  month: number;
  year: number;
}

export interface DashboardSummary {
  month: number;
  year: number;
  period_label: string;
  total_income: number;
  total_expenses: number;
  net_savings: number;
  savings_rate: number;
  total_balance: number;
  transaction_count: number;
  top_category: string | null;
  budget_limit: number;
  budget_spent: number;
  budget_remaining: number;
  budget_utilization: number;
  budget_status: string;
  budget_count: number;
  currency: string;
}

export interface MonthlyTrend {
  month: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  savings_rate: number;
}

export interface MonthlyTrendsResponse {
  trends: MonthlyTrend[];
  months: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  transaction_count: number;
}

export interface CategoryBreakdownResponse {
  month: number;
  year: number;
  total_expenses: number;
  items: CategoryBreakdownItem[];
}

export interface Insight {
  id: number | null;
  insight_type: string;
  title: string;
  description: string;
  severity: "info" | "positive" | "warning" | "critical" | "suggestion" | string;
  source: string;
  created_at: string | null;
}

export interface InsightsResponse {
  insights: Insight[];
  generated_at: string;
  month: number;
  year: number;
  currency: string;
  data_points: number;
  disclaimer: string;
}

export interface CategoryPrediction {
  category: Category;
  confidence: number;
  probabilities: Record<string, number>;
  model_name: string;
  model_version: string;
  source: string;
}

export interface ForecastHistoryPoint {
  month: string;
  amount: number;
}

export interface SpendingForecast {
  status: "ok" | "insufficient_data";
  message: string;
  prediction_month: string | null;
  predicted_amount: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  months_used: number;
  min_months_required: number;
  history: ForecastHistoryPoint[];
  mae: number | null;
  rmse: number | null;
  model_name: string;
  currency: string;
}

export interface ModelInfo {
  model_name: string;
  model_version: string;
  algorithm: string;
  trained_at: string | null;
  dataset_size: number | null;
  categories: string[];
  accuracy: number | null;
  macro_f1: number | null;
  artifact_available: boolean;
}

export interface ClassMetric {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface EvaluationResponse {
  available: boolean;
  message: string;
  model_name: string | null;
  model_version: string | null;
  evaluated_at: string | null;
  test_size: number | null;
  accuracy: number | null;
  macro_precision: number | null;
  macro_recall: number | null;
  macro_f1: number | null;
  labels: string[];
  confusion_matrix: number[][];
  per_class: Record<string, ClassMetric>;
  classification_report: string | null;
}

export interface ChatResponse {
  reply: string;
  intent: string;
  data: Record<string, unknown> | null;
  suggestions: string[];
  source: string;
  disclaimer: string;
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  environment: string;
  timestamp: string;
  database: { connected: boolean; engine: string; error?: string };
  machine_learning: { category_model_available: boolean; auto_train_on_startup: boolean };
}
