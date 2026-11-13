import {
  ArrowUp,
  Bot,
  Info,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/services/api";
import { chatService } from "@/services/chat.service";
import type { ChatResponse } from "@/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  suggestions?: string[];
  source?: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I am your local finance assistant. I can answer questions about your recorded spending, budgets, savings and recent transactions.\n\nI only use the data you have saved in this app. If something is missing, I will tell you instead of inventing an answer.",
  intent: "greeting",
  suggestions: [
    "How much did I spend this month?",
    "Which category has the highest expenses?",
    "How much budget remains?",
    "What were my recent expenses?",
    "How can I use this application?",
  ],
  source: "rule_based",
};

export function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_MESSAGE.suggestions ?? []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    let cancelled = false;
    chatService
      .suggestions()
      .then((items) => {
        if (!cancelled && items.length > 0) setSuggestions(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || sending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);

    try {
      const response: ChatResponse = await chatService.send(message);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.reply,
          intent: response.intent,
          suggestions: response.suggestions,
          source: response.source,
        },
      ]);
      if (response.suggestions.length > 0) setSuggestions(response.suggestions);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: `I could not reach the finance API. ${getApiError(err)}`,
          intent: "error",
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const contextualSuggestions = lastAssistant?.suggestions?.length ? lastAssistant.suggestions : suggestions;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            Rule-based assistant
          </p>
          <h2 className="text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">Finance Assistant</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            A local, deterministic chatbot. It matches your question to an intent and answers from
            your authenticated records — no paid API key and no external LLM.
          </p>
        </div>
        <Badge variant="success" className="w-fit gap-1.5">
          <ShieldCheck className="h-3 w-3" /> Private to your account
        </Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-emerald-400">
                  <Bot className="h-4 w-4" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">Finance Assistant</p>
                <p className="text-[10px] text-slate-400">Local rules · instant replies</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1 text-[9px] uppercase tracking-wide">
              <Sparkles className="h-2.5 w-2.5" /> No API key
            </Badge>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2.5 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    message.role === "user"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-navy-900 text-emerald-400"
                  }`}
                >
                  {message.role === "user" ? (
                    <UserRound className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-tr-sm bg-navy-900 text-white"
                      : "rounded-tl-sm border border-border bg-slate-50/80 text-slate-600"
                  }`}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                  {message.role === "assistant" && message.intent && message.intent !== "error" && (
                    <p className="mt-2 border-t border-slate-200/70 pt-2 text-[9px] font-semibold uppercase tracking-wide text-slate-300">
                      intent: {message.intent} · source: {message.source ?? "rule_based"}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-emerald-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-slate-50 px-4 py-3.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border bg-white p-3.5 sm:p-4">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {contextualSuggestions.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  disabled={sending}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your spending, budget or recent expenses…"
                className="min-h-[44px] max-h-[130px] resize-none py-2.5"
                rows={1}
                maxLength={500}
                aria-label="Message the finance assistant"
              />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={sending || !input.trim()} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
              <Info className="h-3 w-3" /> Answers come only from your saved records. This is not
              financial advice. Press Enter to send, Shift+Enter for a new line.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquareText className="h-4 w-4 text-emerald-600" /> What I can answer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              {[
                "How much did I spend this month?",
                "Which category has the highest expenses?",
                "How much budget remains?",
                "What were my recent expenses?",
                "What is my savings rate?",
                "How can I use this application?",
              ].map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void sendMessage(question)}
                  disabled={sending}
                  className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-60"
                >
                  {question}
                  <ArrowUp className="h-3 w-3 rotate-45 shrink-0 text-slate-300" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-[11px] leading-relaxed text-slate-500">
              <p>
                Your message is normalised and matched against keyword rules for spending,
                categories, budgets, savings, income and recent transactions.
              </p>
              <p>
                The answer is then composed from database queries scoped to{" "}
                <span className="font-semibold text-navy-900">{user?.email}</span>. No data leaves
                this application.
              </p>
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-amber-800">
                If a month has no transactions, the assistant says so rather than guessing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
