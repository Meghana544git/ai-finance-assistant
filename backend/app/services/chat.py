"""Local rule-based finance assistant.

No external LLM or paid API is used. Intents are matched with keyword rules and
every number in an answer is read from the authenticated user's own records.
"""

from __future__ import annotations

import re
from datetime import date

from sqlalchemy.orm import Session

from app.services.analytics import (
    MONTH_NAMES,
    budgets_for_period,
    category_breakdown,
    expenses_for_period,
    income_for_period,
    recent_transactions,
    total_balance,
)
from app.services.formatting import format_money

SUGGESTIONS = [
    "How much did I spend this month?",
    "How much did I spend on food?",
    "Which category has the highest expenses?",
    "How much budget remains?",
    "What were my recent expenses?",
    "How can I use this application?",
]

# Keyword rules for a category-specific spending question. The first matching
# category wins, so lists are ordered from most to least specific.
CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Food": (
        "food", "grocery", "groceries", "restaurant", "swiggy", "zomato",
        "dining", "lunch", "dinner", "coffee", "cafe",
    ),
    "Transport": (
        "transport", "uber", "ola", "cab", "taxi", "fuel", "petrol",
        "diesel", "bus", "train", "metro", "travel",
    ),
    "Shopping": (
        "shopping", "amazon", "flipkart", "clothes", "clothing", "shoes",
        "electronics", "gadget",
    ),
    "Bills": (
        "bill", "electricity", "water", "internet", "recharge", "rent",
        "utility", "gas",
    ),
    "Entertainment": (
        "entertainment", "netflix", "spotify", "movie", "cinema", "game",
        "subscription",
    ),
    "Health": (
        "health", "medical", "pharmacy", "doctor", "hospital", "medicine",
        "gym",
    ),
    "Education": (
        "education", "course", "tuition", "book", "udemy", "coursera",
        "school", "college",
    ),
}



def _normalise(message: str) -> str:
    return re.sub(r"\s+", " ", message.lower()).strip()


def _usage_reply() -> str:
    return (
        "Here is a quick tour of AI Finance Assistant:\n"
        "1. Transactions - add income and expenses. The ML model suggests an expense "
        "category from the title/description, and you can correct it.\n"
        "2. Budgets - set an overall or category monthly limit. You get a warning at 80% "
        "and an alert at 100%.\n"
        "3. Analytics - explore income vs expenses, category totals and savings trends.\n"
        "4. AI Insights - rule-based observations from your own data.\n"
        "5. Predictions - a linear-regression estimate of next month's expenses once you "
        "have enough monthly history.\n"
        "6. Profile - change currency, export transactions to CSV, or delete your account."
    )


def _monthly_spending(db: Session, user_id: int, currency: str) -> dict:
    today = date.today()
    expenses = expenses_for_period(db, user_id, today.year, today.month)
    income = income_for_period(db, user_id, today.year, today.month)
    label = f"{MONTH_NAMES[today.month - 1]} {today.year}"
    if expenses == 0 and income == 0:
        reply = (
            f"You have no transactions recorded for {label} yet, so I cannot report spending. "
            "Add an expense on the Transactions page and ask me again."
        )
    else:
        reply = (
            f"In {label} you have spent {format_money(expenses, currency)} across your "
            f"recorded expenses, against income of {format_money(income, currency)}. "
            f"Your income minus expenses for the month is "
            f"{format_money(income - expenses, currency)}."
        )
    return {
        "reply": reply,
        "intent": "monthly_spending",
        "data": {
            "month": today.month,
            "year": today.year,
            "expenses": expenses,
            "income": income,
            "net": round(income - expenses, 2),
        },
    }


def _top_category(db: Session, user_id: int, currency: str) -> dict:
    today = date.today()
    total, categories = category_breakdown(db, user_id, today.year, today.month)
    label = f"{MONTH_NAMES[today.month - 1]} {today.year}"
    if not categories:
        reply = (
            f"I could not find any expenses for {label}. Add some expense transactions "
            "and I can identify your highest spending category."
        )
        return {"reply": reply, "intent": "top_category", "data": {"categories": []}}

    top = categories[0]
    reply = (
        f"Your highest spending category in {label} is {top['category']} at "
        f"{format_money(top['amount'], currency)} - about {top['percentage']:.1f}% of the "
        f"{format_money(total, currency)} you spent."
    )
    if len(categories) > 1:
        second = categories[1]
        reply += (
            f" It is followed by {second['category']} at "
            f"{format_money(second['amount'], currency)}."
        )
    return {
        "reply": reply,
        "intent": "top_category",
        "data": {"total_expenses": total, "categories": categories},
    }


def _budget_reply(db: Session, user_id: int, currency: str) -> dict:
    today = date.today()
    budgets = budgets_for_period(db, user_id, today.year, today.month)
    label = f"{MONTH_NAMES[today.month - 1]} {today.year}"
    if not budgets:
        reply = (
            f"You have not created a budget for {label}. Open the Budgets page to add an "
            "overall monthly limit or category-specific limits. I will track spending "
            "against them automatically."
        )
        return {"reply": reply, "intent": "budget_status", "data": {"budgets": []}}

    lines = []
    for entry in budgets:
        budget = entry["budget"]
        name = budget.category or "Overall"
        lines.append(
            f"- {name}: spent {format_money(entry['spent'], currency)} of "
            f"{format_money(float(budget.monthly_limit), currency)} "
            f"({entry['utilization']:.1f}%), "
            + (
                f"over by {format_money(abs(entry['remaining']), currency)}"
                if entry["remaining"] < 0
                else f"{format_money(entry['remaining'], currency)} remaining"
            )
        )
    reply = f"Here is your {label} budget status:\n" + "\n".join(lines)
    return {
        "reply": reply,
        "intent": "budget_status",
        "data": {
            "budgets": [
                {
                    "category": entry["budget"].category or "Overall",
                    "limit": float(entry["budget"].monthly_limit),
                    "spent": entry["spent"],
                    "remaining": entry["remaining"],
                    "utilization": entry["utilization"],
                    "status": entry["status"],
                }
                for entry in budgets
            ]
        },
    }


def _recent_reply(db: Session, user_id: int, currency: str) -> dict:
    rows = recent_transactions(db, user_id, limit=5)
    if not rows:
        reply = (
            "You have not recorded any transactions yet. Use the Transactions page to add "
            "your first income or expense, then ask me again."
        )
        return {"reply": reply, "intent": "recent_transactions", "data": {"transactions": []}}

    lines = [
        f"- {row.transaction_date.strftime('%d %b %Y')}: {row.title} - "
        f"{format_money(float(row.amount), currency)} ({row.transaction_type}, {row.category})"
        for row in rows
    ]
    reply = "Your five most recent transactions:\n" + "\n".join(lines)
    return {
        "reply": reply,
        "intent": "recent_transactions",
        "data": {
            "transactions": [
                {
                    "id": row.id,
                    "title": row.title,
                    "amount": float(row.amount),
                    "transaction_type": row.transaction_type,
                    "category": row.category,
                    "transaction_date": row.transaction_date.isoformat(),
                }
                for row in rows
            ]
        },
    }


def _savings_reply(db: Session, user_id: int, currency: str) -> dict:
    today = date.today()
    income = income_for_period(db, user_id, today.year, today.month)
    expenses = expenses_for_period(db, user_id, today.year, today.month)
    label = f"{MONTH_NAMES[today.month - 1]} {today.year}"
    if income == 0 and expenses == 0:
        reply = (
            f"I do not have any {label} records to analyse. Add income and expenses first, "
            "then I can calculate your savings."
        )
    elif income == 0:
        reply = (
            f"You recorded {format_money(expenses, currency)} of expenses in {label} but no "
            "income, so a savings rate cannot be calculated. Add your income to see it."
        )
    else:
        saved = round(income - expenses, 2)
        rate = round((saved / income) * 100, 1)
        reply = (
            f"In {label} you saved {format_money(saved, currency)} from "
            f"{format_money(income, currency)} of income - a savings rate of {rate:.1f}%."
        )
        if saved < 0:
            reply += " You are currently spending more than you earn this month."
        elif rate < 20:
            reply += " A common guideline is to aim for at least 20%, though it depends on your situation."
    return {
        "reply": reply,
        "intent": "savings",
        "data": {"income": income, "expenses": expenses, "saved": round(income - expenses, 2)},
    }


def _category_spending(db: Session, user_id: int, currency: str, category: str) -> dict:
    today = date.today()
    total, categories = category_breakdown(db, user_id, today.year, today.month)
    label = f"{MONTH_NAMES[today.month - 1]} {today.year}"
    match = next((entry for entry in categories if entry["category"] == category), None)

    if match is None:
        reply = (
            f"I could not find any {category} expenses recorded for {label}. "
            "If you paid for something in this category, add it on the Transactions "
            "page and ask me again."
        )
        return {
            "reply": reply,
            "intent": "category_spending",
            "data": {"category": category, "amount": 0.0, "month": today.month, "year": today.year},
        }

    reply = (
        f"You spent {format_money(match['amount'], currency)} on {category} in {label}. "
        f"That is about {match['percentage']:.1f}% of your "
        f"{format_money(total, currency)} total expenses for the month."
    )
    return {
        "reply": reply,
        "intent": "category_spending",
        "data": {
            "category": category,
            "amount": match["amount"],
            "percentage": match["percentage"],
            "total_expenses": total,
            "month": today.month,
            "year": today.year,
        },
    }


def _detect_category(text: str) -> str | None:
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return category
    return None


def handle_message(db: Session, user_id: int, message: str, currency: str = "INR") -> dict:
    text = _normalise(message)

    if not text:
        return {
            "reply": "Please type a question about your recorded finances.",
            "intent": "empty",
            "suggestions": SUGGESTIONS,
        }

    if any(phrase in text for phrase in ("how can i use", "how to use", "what can you do", "help me use", "features")):
        return {"reply": _usage_reply(), "intent": "usage", "suggestions": SUGGESTIONS}

    if any(word in text for word in ("hello", "hi ", "hey", "namaste")) and len(text) < 25:
        return {
            "reply": (
                "Hello! I can answer questions about your recorded spending, budgets, "
                "savings and recent transactions. Try one of the suggestions below."
            ),
            "intent": "greeting",
            "suggestions": SUGGESTIONS,
        }

    if "budget" in text or "limit" in text or "remaining" in text:
        return {**_budget_reply(db, user_id, currency), "suggestions": SUGGESTIONS}

    if any(word in text for word in ("recent", "latest", "last transaction", "last expense", "last few")):
        return {**_recent_reply(db, user_id, currency), "suggestions": SUGGESTIONS}

    detected_category = _detect_category(text)
    if detected_category and any(
        word in text for word in ("spend", "spent", "expense", "cost", "how much")
    ):
        return {
            **_category_spending(db, user_id, currency, detected_category),
            "suggestions": SUGGESTIONS,
        }

    if "highest" in text or "top categor" in text or "most" in text and "categor" in text:
        return {**_top_category(db, user_id, currency), "suggestions": SUGGESTIONS}

    if "saving" in text or "save" in text:
        return {**_savings_reply(db, user_id, currency), "suggestions": SUGGESTIONS}

    if "income" in text or "earn" in text or "salary" in text:
        today = date.today()
        income = income_for_period(db, user_id, today.year, today.month)
        reply = (
            f"Your recorded income for {MONTH_NAMES[today.month - 1]} {today.year} is "
            f"{format_money(income, currency)}."
        )
        return {
            "reply": reply,
            "intent": "income",
            "data": {"income": income},
            "suggestions": SUGGESTIONS,
        }

    if "balance" in text:
        balance = total_balance(db, user_id)
        my_income = income_for_period(db, user_id, date.today().year, date.today().month)
        my_expenses = expenses_for_period(db, user_id, date.today().year, date.today().month)
        reply = (
            f"Your all-time recorded balance (income minus expenses) is "
            f"{format_money(balance, currency)}. This month: income "
            f"{format_money(my_income, currency)}, expenses {format_money(my_expenses, currency)}."
        )
        return {
            "reply": reply,
            "intent": "balance",
            "data": {"total_balance": balance},
            "suggestions": SUGGESTIONS,
        }

    if any(word in text for word in ("predict", "forecast", "next month")):
        reply = (
            "Open the Predictions page to see the linear-regression estimate for next "
            "month. It needs at least four months of expense history and is labelled as an "
            "estimate, not a guarantee."
        )
        return {"reply": reply, "intent": "prediction_help", "suggestions": SUGGESTIONS}

    if any(word in text for word in ("spend", "spent", "expense", "expenses", "cost")):
        return {**_monthly_spending(db, user_id, currency), "suggestions": SUGGESTIONS}

    return {
        "reply": (
            "I can help with questions about this month's spending, your highest spending "
            "category, budget status, recent transactions, savings and income. I only answer "
            "from your saved records and I will say when data is missing."
        ),
        "intent": "fallback",
        "suggestions": SUGGESTIONS,
    }
