"""Machine-learning endpoints: category prediction, forecast, model metadata."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.models.prediction import Prediction
from app.schemas.ml import (
    BatchPredictRequest,
    BatchPredictResponse,
    CategoryPrediction,
    CategoryPredictRequest,
    EvaluationResponse,
    ModelInfo,
    SpendingForecast,
)
from app.services.analytics import monthly_expense_totals
from ml.classifier import (
    ModelUnavailableError,
    get_evaluation,
    get_model_info,
    predict_category,
)
from ml.forecasting import forecast_next_month

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.post("/predict-category", response_model=CategoryPrediction)
def predict_one(payload: CategoryPredictRequest) -> CategoryPrediction:
    try:
        result = predict_category(payload.title, payload.description)
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return CategoryPrediction(**result)


@router.post("/predict-categories", response_model=BatchPredictResponse)
def predict_many(payload: BatchPredictRequest) -> BatchPredictResponse:
    predictions: list[CategoryPrediction] = []
    try:
        for item in payload.items:
            predictions.append(CategoryPrediction(**predict_category(item.title, item.description)))
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    first = predictions[0]
    return BatchPredictResponse(
        predictions=predictions,
        model_name=first.model_name,
        model_version=first.model_version,
    )


@router.post("/predict-spending", response_model=SpendingForecast)
def predict_spending(current_user: CurrentUser, db: DbSession) -> SpendingForecast:
    result = forecast_next_month(db, current_user.id, currency=current_user.preferred_currency)

    if result["status"] == "ok" and result["prediction_month"]:
        # Upsert one prediction per (user, month) so repeated visits do not
        # create duplicates. A stored row is a snapshot of that forecast.
        year, month = int(result["prediction_month"][:4]), int(result["prediction_month"][5:7])
        requested_month = date(year, month, 1)
        existing = db.scalar(
            select(Prediction).where(
                Prediction.user_id == current_user.id,
                Prediction.prediction_month == requested_month,
            )
        )
        if existing is None:
            db.add(
                Prediction(
                    user_id=current_user.id,
                    predicted_amount=Decimal(str(result["predicted_amount"])),
                    prediction_month=requested_month,
                    model_name=result["model_name"],
                )
            )
        else:
            existing.predicted_amount = Decimal(str(result["predicted_amount"]))
            existing.model_name = result["model_name"]
        db.commit()

    return SpendingForecast(**result)


@router.get("/model-info", response_model=ModelInfo)
def model_info() -> ModelInfo:
    info = get_model_info()
    return ModelInfo(**info)


@router.get("/evaluation", response_model=EvaluationResponse)
def evaluation() -> EvaluationResponse:
    data = get_evaluation()
    if not data.get("available"):
        return EvaluationResponse(
            available=False,
            message=data.get(
                "message",
                "Evaluation not available. Run 'python ml/train_model.py' in the backend folder.",
            ),
        )
    return EvaluationResponse(
        available=True,
        message="Metrics from a reproducible stratified train/test split.",
        model_name=data.get("model_name"),
        model_version=data.get("model_version"),
        evaluated_at=data.get("evaluated_at"),
        test_size=data.get("test_size"),
        accuracy=data.get("accuracy"),
        macro_precision=_macro(data.get("per_class"), "precision"),
        macro_recall=_macro(data.get("per_class"), "recall"),
        macro_f1=data.get("macro_f1"),
        labels=data.get("labels", []),
        confusion_matrix=data.get("confusion_matrix", []),
        per_class=data.get("per_class", {}),
        classification_report=data.get("classification_report"),
    )


def _macro(per_class: dict | None, key: str) -> float | None:
    if not per_class:
        return None
    values = [float(metrics.get(key, 0)) for metrics in per_class.values()]
    return round(sum(values) / len(values), 4) if values else None
