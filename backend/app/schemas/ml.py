from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class MLDatasetCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    target_column: str = Field(..., min_length=1, max_length=64)
    feature_columns: List[str]
    dataset_type: str = Field("RESEARCH", pattern="^(DEMONSTRATION|RESEARCH|CLINICAL)$")

class MLDatasetResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    id: str
    name: str
    description: Optional[str]
    target_column: str
    feature_columns: List[str]
    row_count: int
    dataset_type: str = "RESEARCH"
    version: str = "1.0.0"
    file_format: str = "csv"
    created_at: datetime

class TargetDistributionRegression(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    min: float
    max: float
    mean: float
    median: float
    std: float
    unique_count: int
    skewness: float
    q25: float
    q50: float
    q75: float
    iqr: float
    outlier_count: int
    outlier_percentage: float
    outlier_method: str
    lower_fence: float
    upper_fence: float
    histogram: List[Dict[str, Any]]

class TargetDistributionClassification(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    num_classes: int
    classes: List[Dict[str, Any]]
    majority_class: Dict[str, Any]
    minority_class: Dict[str, Any]
    majority_minority_ratio: float
    has_imbalance: bool
    imbalance_level: str
    imbalance_warning: Optional[str] = None
    bar_chart_data: List[Dict[str, Any]]

class TargetAnalysisResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    target_column: str
    total_count: int
    missing_count: int
    missing_percentage: float
    valid_count: int
    unique_count: int
    detected_type: str  # regression, binary_classification, multiclass_classification, unsuitable
    effective_type: str
    is_override: bool = False
    override_type: Optional[str] = None
    override_reason: Optional[str] = None
    type_reasoning: str
    is_suitable: bool = True
    suitability_warnings: List[str] = []
    validation_strategy: Dict[str, Any]
    regression_metrics: Optional[TargetDistributionRegression] = None
    classification_metrics: Optional[TargetDistributionClassification] = None

class MLDatasetDetailResponse(MLDatasetResponse):
    completeness_score: float = 100.0
    duplicate_rows: int = 0
    numerical_columns: List[str] = []
    categorical_columns: List[str] = []
    columns_meta: List[Dict[str, Any]] = []
    summary_stats: Dict[str, Dict[str, Any]] = {}
    stats_numerical: Dict[str, Dict[str, Any]] = {}
    stats_categorical: Dict[str, Dict[str, Any]] = {}
    sample_rows: List[Dict[str, Any]] = []
    target_analysis: Optional[TargetAnalysisResponse] = None

class MLTrainRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    dataset_id: str
    model_name: str = Field(..., min_length=2, max_length=255)
    algorithm: str = Field(
        "RandomForestClassifier",
        pattern="^(RandomForestClassifier|LogisticRegression|DecisionTreeClassifier|RandomForestRegressor|LinearRegression)$"
    )
    task_type: str = Field("classification", pattern="^(classification|regression|binary_classification|multiclass_classification)$")
    target_type_override: Optional[str] = Field(None, pattern="^(regression|binary_classification|multiclass_classification)$")
    feature_columns: Optional[List[str]] = None
    target_column: Optional[str] = None
    test_size: float = Field(0.2, ge=0.1, le=0.5)
    cv_folds: int = Field(5, ge=2, le=10)
    missing_strategy: str = Field("median", pattern="^(median|mean|mode|zero)$")
    categorical_encoding: str = Field("one_hot", pattern="^(one_hot|ordinal)$")
    scaling_method: str = Field("standard", pattern="^(standard|minmax|robust|none)$")
    hyperparameters: Optional[Dict[str, Any]] = None
    async_training: bool = False

class MLTrainingJobResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    job_id: str
    model_id: str
    model_name: str
    status: str
    progress: int
    logs: List[str]
    error: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None

class MLModelResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)
    id: str
    dataset_id: str
    dataset_name: Optional[str] = None
    name: str
    algorithm: str
    task_type: str = "classification"
    target_variable: Optional[str] = None
    version: str = "1.0.0"
    validation_strategy: str = "Held-Out 80/20"
    status: str = "TRAINED"
    metrics: Dict[str, Any] = {}
    cv_scores: Dict[str, Any] = {}
    training_logs: List[str] = []
    hyperparameters: Dict[str, Any] = {}
    feature_names: List[str] = []
    is_active: bool = True
    trained_at: datetime

class MLPredictionRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_id: str
    features: Dict[str, Union[float, int, str]]

class MLPredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_id: str
    model_name: str
    task_type: str = "classification"
    predicted_class: Optional[int] = None
    predicted_value: Optional[float] = None
    predicted_label: str
    probability: Optional[float] = None
    shap_base_value: Optional[float] = None
    feature_attributions: List[Dict[str, Any]] = []
    explanation_summary: str
    outlier_assessment: Dict[str, Any] = {}
    statutory_disclaimer: str

class AnomalyCheckRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    features: Dict[str, float]

class AnomalyCheckResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    is_anomaly: bool
    anomaly_score: float
    description: str
    flagged_features: List[Dict[str, Any]]
