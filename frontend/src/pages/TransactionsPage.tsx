import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { CategoryBadge } from "@/components/CategoryBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/services/api";
import { transactionService } from "@/services/transactions.service";
import type { Transaction, TransactionFilters } from "@/types";
import { CATEGORIES } from "@/utils/categories";
import { formatCurrency, formatDate } from "@/utils/format";

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Amount: high to low" },
  { value: "amount_asc", label: "Amount: low to high" },
  { value: "title_asc", label: "Title: A to Z" },
];

interface FilterState {
  search: string;
  transaction_type: string;
  category: string;
  date_from: string;
  date_to: string;
  sort: string;
  page: number;
  page_size: number;
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  transaction_type: "all",
  category: "all",
  date_from: "",
  date_to: "",
  sort: "date_desc",
  page: 1,
  page_size: 10,
};

function sortToParams(sort: string): Pick<TransactionFilters, "sort_by" | "sort_order"> {
  const [field, order] = sort.split("_");
  const sortBy = field === "date" ? "transaction_date" : field;
  return {
    sort_by: sortBy,
    sort_order: order === "asc" ? "asc" : "desc",
  };
}

export function TransactionsPage() {
  const { currency } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [items, setItems] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState({ total: 0, pages: 0, total_income: 0, total_expenses: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setEditing(null);
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo(() => {
    const sort = sortToParams(filters.sort);
    return {
      search: filters.search || undefined,
      transaction_type: filters.transaction_type === "all" ? undefined : filters.transaction_type,
      category: filters.category === "all" ? undefined : filters.category,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      ...sort,
      page: filters.page,
      page_size: filters.page_size,
    };
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await transactionService.list(query);
      setItems(response.items);
      setMeta({
        total: response.total,
        pages: response.pages,
        total_income: response.total_income,
        total_expenses: response.total_expenses,
      });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const update = (patch: Partial<FilterState>) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
  };

  const refresh = () => setReloadKey((key) => key + 1);

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
      toast.success("CSV exported. Open it in Excel or Google Sheets.");
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await transactionService.remove(deleteTarget.id);
      toast.success("Transaction deleted.");
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters =
    Boolean(filters.search) ||
    filters.transaction_type !== "all" ||
    filters.category !== "all" ||
    Boolean(filters.date_from) ||
    Boolean(filters.date_to);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        description="Every income and expense in one searchable ledger. ML categories can always be corrected by you."
        actions={
          <>
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export CSV
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add transaction
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Search and filters
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
            <div className="relative xl:col-span-4">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search title, description or notes"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-10"
                aria-label="Search transactions"
              />
            </div>
            <div className="xl:col-span-2">
              <Select
                value={filters.transaction_type}
                onChange={(event) => update({ transaction_type: event.target.value })}
                aria-label="Filter by type"
              >
                <option value="all">All types</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
              </Select>
            </div>
            <div className="xl:col-span-2">
              <Select
                value={filters.category}
                onChange={(event) => update({ category: event.target.value })}
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
            <div className="xl:col-span-2">
              <Input
                type="date"
                value={filters.date_from}
                onChange={(event) => update({ date_from: event.target.value })}
                aria-label="From date"
              />
            </div>
            <div className="xl:col-span-2">
              <Input
                type="date"
                value={filters.date_to}
                onChange={(event) => update({ date_to: event.target.value })}
                aria-label="To date"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filters.sort}
                onChange={(event) => update({ sort: event.target.value })}
                className="h-9 w-[190px] text-xs"
                aria-label="Sort transactions"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span>
                <span className="font-semibold text-navy-900">{meta.total}</span> result(s)
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
                {formatCurrency(meta.total_income, currency)}
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-rose-500" />
                {formatCurrency(meta.total_expenses, currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={ReceiptText}
              title={hasFilters ? "No transactions match these filters" : "Your ledger is empty"}
              description={
                hasFilters
                  ? "Try clearing the search or date range, or change the category filter."
                  : "Add your first income or expense and the dashboard will come to life."
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    <RotateCcw className="h-4 w-4" /> Clear filters
                  </Button>
                ) : (
                  <Button onClick={openAdd}>
                    <Plus className="h-4 w-4" /> Add your first transaction
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 font-bold">Date</th>
                    <th className="px-5 py-3 font-bold">Transaction</th>
                    <th className="px-5 py-3 font-bold">Category</th>
                    <th className="px-5 py-3 text-right font-bold">Amount</th>
                    <th className="px-5 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {items.map((transaction) => {
                    const isIncome = transaction.transaction_type === "income";
                    return (
                      <tr key={transaction.id} className="group transition-colors hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-500">
                          {formatDate(transaction.transaction_date)}
                        </td>
                        <td className="max-w-[280px] px-5 py-4">
                          <p className="truncate text-sm font-semibold text-navy-900">{transaction.title}</p>
                          {transaction.description && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">{transaction.description}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isIncome ? (
                            <Badge variant="success">Income</Badge>
                          ) : (
                            <CategoryBadge category={transaction.category} source={transaction.category_source} />
                          )}
                        </td>
                        <td
                          className={`whitespace-nowrap px-5 py-4 text-right text-sm font-bold ${
                            isIncome ? "text-emerald-600" : "text-navy-900"
                          }`}
                        >
                          {isIncome ? "+" : "−"}
                          {formatCurrency(transaction.amount, currency)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-navy-900"
                              onClick={() => openEdit(transaction)}
                              aria-label={`Edit ${transaction.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setDeleteTarget(transaction)}
                              aria-label={`Delete ${transaction.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {items.map((transaction) => {
                const isIncome = transaction.transaction_type === "income";
                return (
                  <div key={transaction.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy-900">{transaction.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {formatDate(transaction.transaction_date)}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-bold ${isIncome ? "text-emerald-600" : "text-navy-900"}`}>
                        {isIncome ? "+" : "−"}
                        {formatCurrency(transaction.amount, currency)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {isIncome ? (
                        <Badge variant="success">Income</Badge>
                      ) : (
                        <CategoryBadge category={transaction.category} source={transaction.category_source} />
                      )}
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(transaction)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleteTarget(transaction)}
                          aria-label={`Delete ${transaction.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Rows per page</span>
              <Select
                value={String(filters.page_size)}
                onChange={(event) => update({ page_size: Number(event.target.value) })}
                className="h-8 w-[72px] text-xs"
                aria-label="Rows per page"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
              <span className="ml-2">
                Page {filters.page} of {Math.max(meta.pages, 1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1 || loading}
                onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= meta.pages || loading}
                onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editing}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this transaction?"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" (${formatCurrency(deleteTarget.amount, currency)}) will be permanently removed and all analytics will update. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete transaction"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
