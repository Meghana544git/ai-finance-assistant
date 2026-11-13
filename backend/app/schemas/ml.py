from pydantic import BaseModel, ConfigDict, Field, field_validator


class CategoryPredictRequest(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=1000)

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title is required for category prediction.")
        return value


class CategoryPrediction(BaseModel):
    category: str
    confidence: float = Field(ge=0, le=1)
    probabilities: dict[str, float]
    model_name: str
    model_version: str
    source: str = "ml"


class BatchPredictRequest(BaseModel):
    items: list[CategoryPredictRequest] = Field(min_length=1, max_length=100)


class BatchPredictResponse(BaseModel):
    predictions: list[CategoryPrediction]
    model_name: str
    model_version: str


class ForecastHistoryPoint(BaseModel):
    month: str
    amount: float


class SpendingForecast(BaseModel):
    status: str = Field(description="'ok' or 'insufficient_data'")
    message: str
    prediction_month: str | None = None
    predicted_amount: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
    months_used: int
    min_months_required: int
    history: list[ForecastHistoryPoint]
    mae: float | None = None
    rmse: float | None = None
    model_name: str = "LinearRegression (trend)"
    currency: str = "INR"


class ModelInfo(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_name: str
    model_version: str
    algorithm: str
    trained_at: str | None = None
    dataset_size: int | None = None
    categories: list[str]
    accuracy: float | None = None
    macro_f1: float | None = None
    artifact_available: bool


class ClassMetric(BaseModel):
    precision: float
    recall: float
    f1_score: float
    support: int


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    available: bool
    message: str
    model_name: str | None = None
    model_version: str | None = None
    evaluated_at: str | None = None
    test_size: int | None = None
    accuracy: float | None = None
    macro_precision: float | None = None
    macro_recall: float | None = None
    macro_f1: float | None = None
    labels: list[str] = Field(default_factory=list)
    confusion_matrix: list[list[int]] = Field(default_factory=list)
    per_class: dict[str, ClassMetric] = Field(default_factory=dict)
    classification_report: str | None = None
