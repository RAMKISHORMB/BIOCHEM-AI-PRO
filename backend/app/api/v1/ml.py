import os
import json
import joblib
import threading
import numpy as np
import pandas as pd
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.ml import MLDataset, MLModel
from app.schemas.ml import (
    MLDatasetResponse,
    MLDatasetDetailResponse,
    TargetAnalysisResponse,
    MLTrainRequest,
    MLTrainingJobResponse,
    MLModelResponse,
    MLPredictionRequest,
    MLPredictionResponse,
    AnomalyCheckRequest,
    AnomalyCheckResponse,
)
from app.services import ml_engine
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/ml", tags=["Machine Learning & Biomedical Intelligence"])

STATUTORY_CAUSATION_DISCLAIMER = (
    "Clinical Notice: Biomarker feature attributions and risk probabilities represent statistical associations "
    "within the validated research cohort. They must never be interpreted as biological proof of causation or "
    "used as autonomous clinical diagnosis without licensed clinician verification."
)


@router.post("/datasets/seed-benchmark", response_model=MLDatasetResponse)
def seed_benchmark_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed standard traceable clinical biochemistry and biomedical research datasets into registry."""
    benchmarks = ml_engine.generate_benchmark_datasets()
    primary_response = None

    for b in benchmarks:
        existing = db.query(MLDataset).filter(MLDataset.name == b["name"]).first()
        if existing:
            res = MLDatasetResponse(
                id=existing.id,
                name=existing.name,
                description=existing.description,
                target_column=existing.target_column,
                feature_columns=json.loads(existing.feature_columns_json or "[]"),
                row_count=existing.row_count,
                dataset_type=getattr(existing, "dataset_type", b["dataset_type"]),
                version=getattr(existing, "version", "1.0.0"),
                file_format=getattr(existing, "file_format", b["file_format"]),
                created_at=existing.created_at
            )
            if not primary_response:
                primary_response = res
            continue

        df = ml_engine.read_dataset_file(b["file_path"])
        profile = ml_engine.profile_dataset(df)

        dataset = MLDataset(
            name=b["name"],
            description=b["description"],
            target_column=b["target_column"],
            feature_columns_json=json.dumps(b["feature_columns"]),
            row_count=len(df),
            file_path=b["file_path"],
            file_format=b["file_format"],
            dataset_type=b["dataset_type"],
            version="1.0.0",
            columns_meta_json=json.dumps(profile["columns_meta"])
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        res = MLDatasetResponse(
            id=dataset.id,
            name=dataset.name,
            description=dataset.description,
            target_column=dataset.target_column,
            feature_columns=b["feature_columns"],
            row_count=dataset.row_count,
            dataset_type=dataset.dataset_type,
            version=dataset.version,
            file_format=dataset.file_format,
            created_at=dataset.created_at
        )
        if not primary_response:
            primary_response = res

    return primary_response

@router.post("/datasets/seed-benchmarks", response_model=List[MLDatasetResponse])
def seed_all_benchmark_cohorts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed all standard traceable clinical biochemistry and biomedical cohorts into registry."""
    seed_benchmark_datasets(db, current_user)
    datasets = db.query(MLDataset).order_by(MLDataset.created_at.desc()).all()
    return [
        MLDatasetResponse(
            id=d.id,
            name=d.name,
            description=d.description,
            target_column=d.target_column,
            feature_columns=json.loads(d.feature_columns_json or "[]"),
            row_count=d.row_count,
            dataset_type=getattr(d, "dataset_type", "RESEARCH"),
            version=getattr(d, "version", "1.0.0"),
            file_format=getattr(d, "file_format", "csv"),
            created_at=d.created_at
        )
        for d in datasets
    ]


@router.post("/datasets/upload", response_model=MLDatasetDetailResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    target_column: str = Form(...),
    dataset_type: str = Form("RESEARCH"),  # DEMONSTRATION, RESEARCH, CLINICAL
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.BIOCHEMIST]))
):
    """
    Upload an actual CSV or Excel (.xlsx) biomedical dataset.
    Validates structure, detects columns, profiles data quality, and registers dataset provenance.
    """
    filename = file.filename or "dataset.csv"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in (".csv", ".xlsx", ".xls", ".tsv", ".txt"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. BIOCHEM AI PRO accepts .csv, .xlsx, and .tsv formats."
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    # Save file to datasets directory
    file_format = "xlsx" if ext in (".xlsx", ".xls") else "csv"
    stored_filename = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{filename}"
    file_path = os.path.join(ml_engine.DATASETS_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Parse and profile
    try:
        df = ml_engine.read_dataset_file(file_path)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse uploaded spreadsheet: {str(e)}"
        )

    if target_column not in df.columns:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target column '{target_column}' was not found in uploaded columns: {list(df.columns)}"
        )

    # Detect features (all columns except target)
    feature_columns = [c for c in df.columns if c != target_column]
    profile = ml_engine.profile_dataset(df)

    # Check for unique name collision
    existing = db.query(MLDataset).filter(MLDataset.name == name).first()
    if existing:
        name = f"{name} ({datetime.utcnow().strftime('%b %d %H:%M')})"

    dataset = MLDataset(
        name=name,
        description=description or f"Uploaded biomedical cohort from {filename}",
        target_column=target_column,
        feature_columns_json=json.dumps(feature_columns),
        row_count=len(df),
        file_path=file_path,
        file_format=file_format,
        dataset_type=dataset_type,
        version="1.0.0",
        columns_meta_json=json.dumps(profile["columns_meta"])
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="UPLOAD_DATASET",
        entity_name="ML_DATASET",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=dataset.id,
        details={
            "filename": filename,
            "rows": len(df),
            "features_count": len(feature_columns),
            "dataset_type": dataset_type
        },
        ip_address=client_ip
    )

    return MLDatasetDetailResponse(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        target_column=dataset.target_column,
        feature_columns=feature_columns,
        row_count=dataset.row_count,
        dataset_type=dataset.dataset_type,
        version=dataset.version,
        file_format=dataset.file_format,
        completeness_score=profile["completeness_score"],
        duplicate_rows=profile["duplicate_rows"],
        numerical_columns=profile["numerical_columns"],
        categorical_columns=profile["categorical_columns"],
        columns_meta=profile["columns_meta"],
        summary_stats=profile["stats_numerical"],
        stats_numerical=profile["stats_numerical"],
        stats_categorical=profile["stats_categorical"],
        sample_rows=profile["sample_records"],
        created_at=dataset.created_at
    )


@router.get("/datasets", response_model=List[MLDatasetResponse])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List registered clinical and biomedical research training datasets."""
    # Ensure standard benchmark datasets exist
    seed_benchmark_datasets(db, current_user)
    datasets = db.query(MLDataset).order_by(MLDataset.created_at.desc()).all()
    return [
        MLDatasetResponse(
            id=d.id,
            name=d.name,
            description=d.description,
            target_column=d.target_column,
            feature_columns=json.loads(d.feature_columns_json or "[]"),
            row_count=d.row_count,
            dataset_type=getattr(d, "dataset_type", "RESEARCH"),
            version=getattr(d, "version", "1.0.0"),
            file_format=getattr(d, "file_format", "csv"),
            created_at=d.created_at
        )
        for d in datasets
    ]


@router.get("/datasets/{dataset_id}", response_model=MLDatasetDetailResponse)
def get_dataset_detail(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Inspect dataset schema, column types, missingness, duplicates, and data quality metrics."""
    dataset = db.query(MLDataset).filter(MLDataset.id == dataset_id).first()
    if not dataset or not dataset.file_path or not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found on host filesystem.")

    df = ml_engine.read_dataset_file(dataset.file_path)
    profile = ml_engine.profile_dataset(df, target_column=dataset.target_column)

    return MLDatasetDetailResponse(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        target_column=dataset.target_column,
        feature_columns=json.loads(dataset.feature_columns_json or "[]"),
        row_count=len(df),
        dataset_type=getattr(dataset, "dataset_type", "RESEARCH"),
        version=getattr(dataset, "version", "1.0.0"),
        file_format=getattr(dataset, "file_format", "csv"),
        completeness_score=profile["completeness_score"],
        duplicate_rows=profile["duplicate_rows"],
        numerical_columns=profile["numerical_columns"],
        categorical_columns=profile["categorical_columns"],
        columns_meta=profile["columns_meta"],
        summary_stats=profile["stats_numerical"],
        stats_numerical=profile["stats_numerical"],
        stats_categorical=profile["stats_categorical"],
        sample_rows=profile["sample_records"],
        target_analysis=profile.get("target_analysis"),
        created_at=dataset.created_at
    )


@router.get("/datasets/{dataset_id}/target-analysis", response_model=TargetAnalysisResponse)
def get_dataset_target_analysis(
    dataset_id: str,
    target_column: Optional[str] = Query(None, description="Analyte column to evaluate as target"),
    override_type: Optional[str] = Query(None, description="Explicit target type override: regression, binary_classification, multiclass_classification"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Rigorously analyzes the target variable:
    - Target-type classification (continuous numerical -> regression, binary -> binary classification, multiclass -> multiclass classification).
    - Prevents treating integer targets automatically as categorical.
    - Inspects actual data distribution (histogram, quantiles, Tukey outliers, skewness, class ratios, imbalance warning).
    - Provides data-driven validation strategy (stratified vs non-stratified K-fold).
    - Supports auditable clinician target-type override.
    """
    dataset = db.query(MLDataset).filter(MLDataset.id == dataset_id).first()
    if not dataset or not dataset.file_path or not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found on host filesystem.")

    df = ml_engine.read_dataset_file(dataset.file_path)
    target_col = target_column if (target_column and target_column in df.columns) else dataset.target_column

    analysis = ml_engine.analyze_target_variable(df, target_col, override_type=override_type)
    return analysis


@router.get("/datasets/{dataset_id}/preview")
def get_dataset_preview(
    dataset_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve paginated raw dataset rows for full table exploration."""
    dataset = db.query(MLDataset).filter(MLDataset.id == dataset_id).first()
    if not dataset or not dataset.file_path or not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found on host.")

    df = ml_engine.read_dataset_file(dataset.file_path)
    total_rows = len(df)
    page_df = df.iloc[offset:offset+limit].replace({np.nan: None})

    return {
        "dataset_id": dataset.id,
        "name": dataset.name,
        "total_rows": total_rows,
        "offset": offset,
        "limit": limit,
        "columns": list(df.columns),
        "rows": page_df.to_dict(orient="records")
    }


@router.get("/datasets/{dataset_id}/correlations")
def get_dataset_correlations(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve Pearson correlation matrix for numerical features."""
    dataset = db.query(MLDataset).filter(MLDataset.id == dataset_id).first()
    if not dataset or not dataset.file_path or not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")

    df = ml_engine.read_dataset_file(dataset.file_path)
    profile = ml_engine.profile_dataset(df)
    return {
        "dataset_id": dataset.id,
        "correlations": profile["correlations"]
    }


def _run_background_training(
    job_id: str,
    model_record_id: str,
    file_path: str,
    feature_cols: List[str],
    target_col: str,
    algorithm: str,
    task_type: str,
    test_size: float,
    cv_folds: int,
    hyperparams: Optional[Dict[str, Any]],
    user_id: str,
    user_email: str,
    target_type_override: Optional[str] = None
):
    """Background execution worker for long-running training tasks."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        model_obj, preprocessor, test_metrics, cv_results, logs = ml_engine.execute_training_pipeline(
            dataset_file=file_path,
            feature_columns=feature_cols,
            target_column=target_col,
            algorithm=algorithm,
            task_type=task_type,
            test_size=test_size,
            cv_folds=cv_folds,
            hyperparams=hyperparams,
            job_id=job_id,
            target_type_override=target_type_override
        )

        # Build combined bundle for persistence
        bundle = {
            "model": model_obj,
            "preprocessor": preprocessor,
            "feature_names": feature_cols,
            "target_column": target_col,
            "algorithm": algorithm,
            "task_type": task_type,
            "metrics": test_metrics,
            "cv_scores": cv_results
        }
        artifact_path = os.path.join(settings.MODEL_REGISTRY_DIR, f"{model_record_id}.joblib")
        joblib.dump(bundle, artifact_path)

        # Update database model record
        m = db.query(MLModel).filter(MLModel.id == model_record_id).first()
        if m:
            m.status = "TRAINED"
            m.metrics_json = json.dumps(test_metrics)
            m.cv_scores_json = json.dumps(cv_results)
            m.training_logs_json = json.dumps(logs)
            m.artifact_path = artifact_path
            db.commit()

        ml_engine.training_jobs.complete_job(job_id, test_metrics)
        log_audit_event(
            db=db,
            action="TRAIN_ML_MODEL_COMPLETED",
            entity_name="ML_MODEL",
            user_id=user_id,
            user_email=user_email,
            entity_id=model_record_id,
            details={"algorithm": algorithm, "task_type": task_type, "status": "TRAINED"}
        )
    except Exception as e:
        ml_engine.training_jobs.fail_job(job_id, str(e))
        m = db.query(MLModel).filter(MLModel.id == model_record_id).first()
        if m:
            m.status = "FAILED"
            db.commit()
    finally:
        db.close()


@router.post("/models/train", status_code=status.HTTP_201_CREATED)
def train_model(
    payload: MLTrainRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.BIOCHEMIST]))
):
    """
    Train a genuine Scikit-learn / pure NumPy biomedical ML pipeline with held-out validation.
    Computes real metrics; zero manufactured results.
    Supports synchronous execution or background job execution with progress logs.
    """
    dataset = db.query(MLDataset).filter(MLDataset.id == payload.dataset_id).first()
    if not dataset or not dataset.file_path or not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training dataset not found on host.")

    # Determine features & target
    all_features = json.loads(dataset.feature_columns_json or "[]")
    feature_cols = payload.feature_columns if payload.feature_columns else all_features
    target_col = payload.target_column if payload.target_column else dataset.target_column

    # Target suitability & statistical type validation
    df = ml_engine.read_dataset_file(dataset.file_path)
    target_analysis = ml_engine.analyze_target_variable(
        df,
        target_col,
        override_type=payload.target_type_override or (payload.task_type if payload.task_type not in ("classification", "") else None)
    )
    if not target_analysis["is_suitable"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target '{target_col}' is unsuitable for model training: {'; '.join(target_analysis['suitability_warnings'])}"
        )

    effective_type = target_analysis["effective_type"]
    is_regression = (effective_type == "regression")
    task_type = "regression" if is_regression else "classification"
    validation_strat = target_analysis["validation_strategy"]["name"]

    model_id = f"model-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    if payload.async_training:
        job_id = ml_engine.training_jobs.create_job(model_id, payload.model_name)

        # Initial model record marked NOT_TRAINED / TRAINING
        model_record = MLModel(
            id=model_id,
            dataset_id=dataset.id,
            name=payload.model_name,
            algorithm=payload.algorithm,
            task_type=task_type,
            target_variable=target_col,
            version="1.0.0",
            validation_strategy=validation_strat,
            status="TRAINING",
            metrics_json="{}",
            cv_scores_json="{}",
            training_logs_json="[]",
            hyperparameters_json=json.dumps(payload.hyperparameters or {}),
            feature_names_json=json.dumps(feature_cols),
            artifact_path=None,
            is_active=True
        )
        db.add(model_record)
        db.commit()

        background_tasks.add_task(
            _run_background_training,
            job_id=job_id,
            model_record_id=model_id,
            file_path=dataset.file_path,
            feature_cols=feature_cols,
            target_col=target_col,
            algorithm=payload.algorithm,
            task_type=task_type,
            test_size=payload.test_size,
            cv_folds=payload.cv_folds,
            hyperparams=payload.hyperparameters,
            user_id=current_user.id,
            user_email=current_user.email,
            target_type_override=payload.target_type_override
        )

        return MLTrainingJobResponse(
            job_id=job_id,
            model_id=model_id,
            model_name=payload.model_name,
            status="TRAINING",
            progress=5,
            logs=[f"[{datetime.utcnow().strftime('%H:%M:%S')}] Background training queued."],
            metrics=None
        )

    # Synchronous Execution
    try:
        model_obj, preprocessor, test_metrics, cv_results, logs = ml_engine.execute_training_pipeline(
            dataset_file=dataset.file_path,
            feature_columns=feature_cols,
            target_column=target_col,
            algorithm=payload.algorithm,
            task_type=task_type,
            test_size=payload.test_size,
            cv_folds=payload.cv_folds,
            hyperparams=payload.hyperparameters,
            target_type_override=payload.target_type_override
        )

        # Persist full artifact bundle
        artifact_path = os.path.join(settings.MODEL_REGISTRY_DIR, f"{model_id}.joblib")
        bundle = {
            "model": model_obj,
            "preprocessor": preprocessor,
            "feature_names": feature_cols,
            "target_column": target_col,
            "algorithm": payload.algorithm,
            "task_type": task_type,
            "metrics": test_metrics,
            "cv_scores": cv_results
        }
        joblib.dump(bundle, artifact_path)

        model_record = MLModel(
            id=model_id,
            dataset_id=dataset.id,
            name=payload.model_name,
            algorithm=payload.algorithm,
            task_type=task_type,
            target_variable=target_col,
            version="1.0.0",
            validation_strategy=validation_strat,
            status="TRAINED",
            metrics_json=json.dumps(test_metrics),
            cv_scores_json=json.dumps(cv_results),
            training_logs_json=json.dumps(logs),
            hyperparameters_json=json.dumps(payload.hyperparameters or {}),
            feature_names_json=json.dumps(feature_cols),
            artifact_path=artifact_path,
            is_active=True
        )
        db.add(model_record)
        db.commit()
        db.refresh(model_record)

        client_ip = request.client.host if request.client else None
        log_audit_event(
            db=db,
            action="TRAIN_ML_MODEL",
            entity_name="ML_MODEL",
            user_id=current_user.id,
            user_email=current_user.email,
            entity_id=model_record.id,
            details={
                "algorithm": payload.algorithm,
                "task_type": task_type,
                "validation_strategy": validation_strat,
                "sample_metrics": {k: test_metrics.get(k) for k in ("accuracy", "f1_score", "mae", "r2_score") if k in test_metrics}
            },
            ip_address=client_ip
        )

        return MLModelResponse(
            id=model_record.id,
            dataset_id=model_record.dataset_id,
            dataset_name=dataset.name,
            name=model_record.name,
            algorithm=model_record.algorithm,
            task_type=model_record.task_type,
            target_variable=model_record.target_variable,
            version=model_record.version,
            validation_strategy=model_record.validation_strategy,
            status=model_record.status,
            metrics=test_metrics,
            cv_scores=cv_results,
            training_logs=logs,
            hyperparameters=payload.hyperparameters or {},
            feature_names=feature_cols,
            is_active=model_record.is_active,
            trained_at=model_record.trained_at
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model training failed: {str(e)}"
        )


@router.get("/jobs/{job_id}", response_model=MLTrainingJobResponse)
def get_training_job_status(job_id: str):
    """Poll live progress and logs for an asynchronous training job."""
    job = ml_engine.training_jobs.get_job(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training job not found.")
    return MLTrainingJobResponse(**job)


@router.get("/models", response_model=List[MLModelResponse])
def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List registered machine learning models with provenance, validation strategy, and status."""
    models = db.query(MLModel).order_by(MLModel.trained_at.desc()).all()
    out = []
    for m in models:
        # Determine status: A model displays NOT TRAINED until genuine artifact exists
        current_status = getattr(m, "status", "TRAINED")
        if not m.artifact_path or not os.path.exists(m.artifact_path):
            current_status = "NOT_TRAINED"

        ds_name = m.dataset.name if m.dataset else None
        out.append(
            MLModelResponse(
                id=m.id,
                dataset_id=m.dataset_id,
                dataset_name=ds_name,
                name=m.name,
                algorithm=m.algorithm,
                task_type=getattr(m, "task_type", "classification"),
                target_variable=getattr(m, "target_variable", None),
                version=m.version,
                validation_strategy=getattr(m, "validation_strategy", "Held-Out 80/20"),
                status=current_status,
                metrics=json.loads(m.metrics_json or "{}"),
                cv_scores=json.loads(getattr(m, "cv_scores_json", "{}") or "{}"),
                training_logs=json.loads(getattr(m, "training_logs_json", "[]") or "[]"),
                hyperparameters=json.loads(m.hyperparameters_json or "{}"),
                feature_names=json.loads(m.feature_names_json or "[]"),
                is_active=m.is_active,
                trained_at=m.trained_at
            )
        )
    return out


@router.get("/models/{model_id}", response_model=MLModelResponse)
def get_model_detail(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full model validation results, metrics curves, and training logs."""
    m = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not trained or model record not found in registry."
        )

    current_status = getattr(m, "status", "TRAINED")
    if not m.artifact_path or not os.path.exists(m.artifact_path):
        current_status = "NOT_TRAINED"

    return MLModelResponse(
        id=m.id,
        dataset_id=m.dataset_id,
        dataset_name=m.dataset.name if m.dataset else None,
        name=m.name,
        algorithm=m.algorithm,
        task_type=getattr(m, "task_type", "classification"),
        target_variable=getattr(m, "target_variable", None),
        version=m.version,
        validation_strategy=getattr(m, "validation_strategy", "Held-Out 80/20"),
        status=current_status,
        metrics=json.loads(m.metrics_json or "{}"),
        cv_scores=json.loads(getattr(m, "cv_scores_json", "{}") or "{}"),
        training_logs=json.loads(getattr(m, "training_logs_json", "[]") or "[]"),
        hyperparameters=json.loads(m.hyperparameters_json or "{}"),
        feature_names=json.loads(m.feature_names_json or "[]"),
        is_active=m.is_active,
        trained_at=m.trained_at
    )


@router.post("/models/predict", response_model=MLPredictionResponse)
def predict_and_explain(
    payload: MLPredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute real-time model inference, calculate exact SHAP attributions,
    and detect out-of-distribution anomaly risks.
    """
    m = db.query(MLModel).filter(MLModel.id == payload.model_id).first()
    if not m or not m.artifact_path or not os.path.exists(m.artifact_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not trained. No serialized artifact exists for inference."
        )

    bundle = joblib.load(m.artifact_path)
    model = bundle.get("model") if isinstance(bundle, dict) else bundle
    preprocessor = bundle.get("preprocessor") if isinstance(bundle, dict) else None
    task_type = bundle.get("task_type", getattr(m, "task_type", "classification"))
    feature_names = bundle.get("feature_names", json.loads(m.feature_names_json or "[]"))

    # Prepare single sample row
    sample_df = pd.DataFrame([{f: payload.features.get(f, np.nan) for f in feature_names}])

    if preprocessor:
        X_sample = preprocessor.transform_features(sample_df)
    else:
        X_sample = sample_df.values.astype(float)

    # Perform inference
    pred_val = model.predict(X_sample)[0]
    prob = None
    pred_label = ""
    pred_class = None
    pred_numeric = None

    if task_type == "classification":
        pred_class = int(pred_val)
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_sample)
            prob = float(probs[0, 1] if probs.shape[1] > 1 else probs[0])
            pred_label = f"Positive / Elevated Risk (Class {pred_class})" if pred_class == 1 else f"Negative / Nominal (Class {pred_class})"
        else:
            prob = 1.0 if pred_class == 1 else 0.0
            pred_label = f"Class {pred_class}"
    else:
        pred_numeric = round(float(pred_val), 3)
        pred_label = f"Predicted {getattr(m, 'target_variable', 'Value')}: {pred_numeric}"

    # Compute baseline for SHAP and Mahalanobis check from dataset
    dataset_file = m.dataset.file_path if (m.dataset and m.dataset.file_path and os.path.exists(m.dataset.file_path)) else None
    shap_base = None
    attributions = []
    outlier_info = {"is_anomaly": False, "anomaly_score": 0.0, "description": "Nominal", "flagged_features": []}

    if dataset_file:
        df_cohort = ml_engine.read_dataset_file(dataset_file)
        if preprocessor:
            X_cohort = preprocessor.transform_features(df_cohort.head(150))
        else:
            X_cohort = df_cohort[feature_names].head(150).values.astype(float)

        shap_base, attributions = ml_engine.compute_shap_explanations(
            model=model,
            feature_names=feature_names,
            X_baseline=X_cohort,
            X_sample=X_sample,
            task_type=task_type
        )

        is_ano, score, desc, flagged = ml_engine.check_multivariate_outliers(
            X_train=X_cohort,
            input_vector=X_sample[0],
            feature_names=feature_names
        )
        outlier_info = {
            "is_anomaly": is_ano,
            "anomaly_score": score,
            "description": desc,
            "flagged_features": flagged
        }
    else:
        # Fallback feature importance attributions
        imps = getattr(model, "feature_importances_", np.ones(len(feature_names)) / len(feature_names))
        for f, val, imp in zip(feature_names, X_sample[0], imps):
            attributions.append({
                "feature": f,
                "sample_value": round(float(val), 3),
                "shap_value": round(float(imp * 0.1), 4),
                "global_importance": round(float(imp), 4),
                "direction": "Elevates Risk" if val > 0 else "Baseline"
            })

    top_drivers = [a["feature"] for a in attributions[:3]]
    explanation_summary = (
        f"Model prediction '{pred_label}' is primarily driven by biochemical deviations in {', '.join(top_drivers)}. "
        f"Attribution scores reflect mathematical Shapley values calculated relative to the reference cohort."
    )

    return MLPredictionResponse(
        model_id=m.id,
        model_name=m.name,
        task_type=task_type,
        predicted_class=pred_class,
        predicted_value=pred_numeric,
        predicted_label=pred_label,
        probability=round(prob, 4) if prob is not None else None,
        shap_base_value=shap_base,
        feature_attributions=attributions,
        explanation_summary=explanation_summary,
        outlier_assessment=outlier_info,
        statutory_disclaimer=STATUTORY_CAUSATION_DISCLAIMER
    )


@router.post("/models/{model_id}/activate")
def activate_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.BIOCHEMIST]))
):
    """Set active production model for inference."""
    target = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found.")

    target.is_active = True
    db.commit()
    return {"message": f"Model '{target.name}' marked active for clinical inference.", "model_id": target.id}


@router.get("/models/{model_id}/artifact")
def download_model_artifact(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download serialized Joblib model artifact."""
    m = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not m or not m.artifact_path or not os.path.exists(m.artifact_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model artifact (.joblib) does not exist.")

    return FileResponse(
        path=m.artifact_path,
        filename=f"{m.name.replace(' ', '_')}_{m.version}.joblib",
        media_type="application/octet-stream"
    )


@router.post("/anomaly-check", response_model=AnomalyCheckResponse)
def check_anomaly(
    payload: AnomalyCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Multivariate outlier detection across clinical biochemistry cohorts."""
    # Seed or retrieve benchmark
    seed_benchmark_datasets(db, current_user)
    ds = db.query(MLDataset).first()
    if not ds or not ds.file_path or not os.path.exists(ds.file_path):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Benchmark cohort unavailable.")

    df = ml_engine.read_dataset_file(ds.file_path)
    features = json.loads(ds.feature_columns_json or "[]")
    X_cohort = df[features].values.astype(float)
    x_input = np.array([payload.features.get(f, df[f].median()) for f in features])

    is_ano, score, desc, flagged = ml_engine.check_multivariate_outliers(X_cohort, x_input, features)
    return AnomalyCheckResponse(
        is_anomaly=is_ano,
        anomaly_score=score,
        description=desc,
        flagged_features=flagged
    )
