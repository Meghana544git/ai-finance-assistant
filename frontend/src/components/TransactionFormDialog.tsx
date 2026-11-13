import { Check, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/services/api";
import { mlService } from "@/services/ml.service";
import { transactionService } from "@/services/transactions.service";
import type { Category, CategoryPrediction, Transaction, TransactionType } from "@/types";
import { CATEGORIES } from "@/utils/categories";
import { todayISO } from "@/utils/format";

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSaved: () => void;
}

type Source = "manual" | "ml";

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  onSaved,
}: TransactionFormDialogProps) {
  const { currency } = useAuth();
  const isEditing = Boolean(transaction);

  const [type, setType] = useState<TransactionType>("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<Source>("manual");
  const [suggestion, setSuggestion] = useState<CategoryPrediction | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.transaction_type);
      setTitle(transaction.title);
      setAmount(String(transaction.amount));
      setCategory(transaction.category);
      setDate(transaction.transaction_date);
      setDescription(transaction.description ?? "");
      setNotes(transaction.notes ?? "");
      setSource(transaction.category_source === "ml" ? "ml" : "manual");
    } else {
      setType("expense");
      setTitle("");
      setAmount("");
      setCategory("");
      setDate(todayISO());
      setDescription("");
      setNotes("");
      setSource("manual");
    }
    setSuggestion(null);
    setError(null);
    setSaving(false);
  }, [open, transaction]);

  // Client-side ML suggestion. The backend still validates and can classify
  // automatically, but this lets the user review the prediction first.
  useEffect(() => {
    if (!open || type !== "expense") {
      setSuggestion(null);
      return;
    }
    const trimmed = title.trim();
    if (trimmed.length < 3) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    setSuggesting(true);
    const timer = window.setTimeout(async () => {
      try {
        const prediction = await mlService.predictCategory(trimmed, description.trim() || undefined);
        if (!cancelled) setSuggestion(prediction);
      } catch {
        if (!cancelled) setSuggestion(null);
      } finally {
        if (!cancelled) setSuggesting(false);
      }
    }, 550);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setSuggesting(false);
    };
  }, [open, title, description, type]);

  const applySuggestion = () => {
    if (!suggestion) return;
    setCategory(suggestion.category);
    setSource("ml");
    toast.success(`Category set to ${suggestion.category}. You can still change it.`);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setSource("manual");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const amountValue = Number(amount);
    if (!title.trim()) {
      setError("Give the transaction a title.");
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!date) {
      setError("Choose a transaction date.");
      return;
    }

    setSaving(true);
    try {
      if (transaction) {
        await transactionService.update(transaction.id, {
          title: title.trim(),
          amount: Number(amountValue.toFixed(2)),
          transaction_type: type,
          category: category ? (category as Category) : null,
          transaction_date: date,
          description: description.trim() || null,
          notes: notes.trim() || null,
        });
        toast.success("Transaction updated.");
      } else {
        await transactionService.create({
          title: title.trim(),
          amount: Number(amountValue.toFixed(2)),
          transaction_type: type,
          category: category ? (category as Category) : null,
          transaction_date: date,
          description: description.trim() || null,
          notes: notes.trim() || null,
          category_source: type === "expense" ? source : "manual",
        });
        toast.success("Transaction added.");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details below. Changes are reflected across all analytics."
              : "Record income or an expense. The ML model can suggest an expense category."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorState message={error} compact />}

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {(["expense", "income"] as TransactionType[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-all ${
                  type === option
                    ? option === "expense"
                      ? "bg-white text-navy-900 shadow-sm"
                      : "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-navy-900"
                }`}
              >
                {option === "expense" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tx-title">Title</Label>
              <Input
                id="tx-title"
                placeholder={type === "expense" ? "e.g. Swiggy dinner order" : "e.g. Monthly salary"}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-amount">Amount ({currency})</Label>
              <Input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>

            {type === "expense" && (
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tx-category">Category</Label>
                  {source === "ml" && category && (
                    <Badge variant="purple" className="gap-1 text-[10px]">
                      <Sparkles className="h-2.5 w-2.5" /> AI-suggested
                    </Badge>
                  )}
                </div>
                <Select
                  id="tx-category"
                  value={category}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                >
                  <option value="">Let the model decide</option>
                  {CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>

                <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                  <div className="flex items-start gap-2">
                    <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                    <div className="min-w-0 flex-1">
                      {suggesting ? (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                          <Loader2 className="h-3 w-3 animate-spin" /> Analysing the transaction text…
                        </p>
                      ) : suggestion ? (
                        <>
                          <p className="text-xs text-violet-800">
                            ML suggests{" "}
                            <span className="font-bold">{suggestion.category}</span>{" "}
                            <span className="text-violet-500">
                              ({Math.round(suggestion.confidence * 100)}% confidence)
                            </span>
                            {category === suggestion.category && (
                              <Check className="ml-1 inline h-3 w-3 text-emerald-600" />
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Button type="button" size="sm" variant="outline" className="h-7 border-violet-200 bg-white text-[11px] text-violet-700" onClick={applySuggestion}>
                              Use {suggestion.category}
                            </Button>
                            {suggestion.category !== category && category && (
                              <span className="text-[10px] text-violet-500">Your current choice stays unless you apply it.</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs leading-relaxed text-violet-700/70">
                          Type a title and description to get a category suggestion from the
                          trained TF-IDF + Logistic Regression model.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  Never a requirement — choose a category manually whenever the suggestion is
                  wrong. Corrections are stored to support future retraining.
                </p>
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tx-description">Description (optional)</Label>
              <Textarea
                id="tx-description"
                placeholder="Add context the ML model can use, e.g. 'Uber cab to airport at 6am'"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                className="min-h-[70px]"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tx-notes">Private notes (optional)</Label>
              <Input
                id="tx-notes"
                placeholder="Only visible to you"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
