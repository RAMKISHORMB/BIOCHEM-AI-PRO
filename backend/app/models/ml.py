import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class MLDataset(Base):
    __tablename__ = "ml_datasets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    target_column = Column(String(64), nullable=False)
    feature_columns_json = Column(Text, nullable=False, default="[]")  # List of analyte/feature codes
    row_count = Column(Integer, nullable=False, default=0)
    file_path = Column(String(512), nullable=True)
    file_format = Column(String(16), nullable=False, default="csv")  # csv, xlsx
    dataset_type = Column(String(32), nullable=False, default="RESEARCH")  # DEMONSTRATION, RESEARCH, CLINICAL
    version = Column(String(32), nullable=False, default="1.0.0")
    columns_meta_json = Column(Text, nullable=False, default="{}")  # summary of types, nulls, duplicates
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    models = relationship("MLModel", back_populates="dataset", cascade="all, delete-orphan")


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("ml_datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    algorithm = Column(String(64), nullable=False)  # RandomForestClassifier, LogisticRegression, DecisionTreeClassifier, RandomForestRegressor, LinearRegression
    task_type = Column(String(32), nullable=False, default="classification")  # classification, regression
    target_variable = Column(String(64), nullable=True)
    version = Column(String(32), nullable=False, default="1.0.0")
    validation_strategy = Column(String(128), nullable=False, default="Held-Out 80/20")
    status = Column(String(32), nullable=False, default="TRAINED")  # NOT_TRAINED, TRAINING, TRAINED, FAILED
    metrics_json = Column(Text, nullable=False, default="{}")  # accuracy, precision, recall, f1, roc_auc, pr_auc, confusion_matrix / mae, mse, rmse, r2
    cv_scores_json = Column(Text, nullable=False, default="{}")  # cross validation metrics across folds
    training_logs_json = Column(Text, nullable=False, default="[]")  # timestamped step-by-step logs
    hyperparameters_json = Column(Text, nullable=False, default="{}")
    feature_names_json = Column(Text, nullable=False, default="[]")
    artifact_path = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    trained_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    dataset = relationship("MLDataset", back_populates="models")
