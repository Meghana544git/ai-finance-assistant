"""Monthly expense forecasting with Scikit-learn Linear Regression.

A per-user ordinary least squares trend is fitted on continuous monthly expense
totals. Accuracy is estimated with a walk-forward (chronological) validation so
future months are never used to predict the past.
"""

from __future__ import annotations

import math
from datetime import date

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.analytics import monthly_expense_totals, shift_month

MODEL_NAME = "LinearRegression (trend)"


def _walk_forward_metrics(values: list[float], min_train: int = 3) -> tuple[float | None, float | None, list[float]]:
    """Chronological expanding-window evaluation of one-step-ahead forecasts."""
    actuals: list[float] = []
    predictions: list[float] = []
    residuals: list[float] = []

    if len(values) <= min_train:
        return None, None, residuals

    for index in range(min_train, len(values)):
        train = np.array(values[:index], dtype=float)
        X_train = np.arange(len(train)).reshape(-1, 1)
        model = LinearRegression().fit(X_train, train)
        predicted = float(model.predict(np.array([[index]]))[0])
        actual = float(values[index])
        predictions.append(max(predicted, 0.0))
        actuals.append(actual)
        residuals.append(actual - predicted)

    mae = float(mean_absolute_error(actuals, predictions))
    rmse = float(math.sqrt(mean_squared_error(actuals, predictions)))
    return round(mae, 2), round(rmse, 2), residuals


def forecast_next_month(db: Session, user_id: int, currency: str = "INR") -> dict:
    history = monthly_expense_totals(db, user_id)
    min_months = settings.MIN_FORECAST_MONTHS
    history_payload = [{"month": month, "amount": amount} for month, amount in history]

    if len(history) < min_months:
        return {
            "status": "insufficient_data",
            "message": (
                f"Not enough history to forecast. At least {min_months} months with "
                f"expense records are required; you currently have {len(history)}. "
                "Keep recording expenses to unlock predictions."
            ),
            "prediction_month": None,
            "predicted_amount": None,
            "lower_bound": None,
            "upper_bound": None,
            "months_used": len(history),
            "min_months_required": min_months,
            "history": history_payload,
            "mae": None,
            "rmse": None,
            "model_name": MODEL_NAME,
            "currency": currency,
        }

    values = [amount for _, amount in history]
    X = np.arange(len(values)).reshape(-1, 1)
    y = np.array(values, dtype=float)
    model = LinearRegression().fit(X, y)
    predicted = float(model.predict(np.array([[len(values)]]))[0])
    predicted = max(predicted, 0.0)

    mae, rmse, residuals = _walk_forward_metrics(values)
    if len(residuals) >= 2:
        spread = float(np.std(residuals, ddof=1))
        # A small minimum band (5% of the point estimate) avoids presenting a
        # zero-width interval when the history happens to be perfectly linear.
        margin = max(1.96 * spread, predicted * 0.05)
    else:
        # Transparent heuristic when walk-forward residuals are unavailable.
        margin = predicted * 0.15

    last_month_str = history[-1][0]
    last_year, last_month = int(last_month_str[:4]), int(last_month_str[5:7])
    next_year, next_month = shift_month(last_year, last_month, 1)

    return {
        "status": "ok",
        "message": (
            "This is a statistical estimate based only on your monthly expense totals, "
            "not a guarantee of future spending."
        ),
        "prediction_month": f"{next_year:04d}-{next_month:02d}",
        "predicted_amount": round(predicted, 2),
        "lower_bound": round(max(predicted - margin, 0.0), 2),
        "upper_bound": round(predicted + margin, 2),
        "months_used": len(values),
        "min_months_required": min_months,
        "history": history_payload,
        "mae": mae,
        "rmse": rmse,
        "model_name": MODEL_NAME,
        "currency": currency,
    }
