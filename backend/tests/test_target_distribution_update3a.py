import pytest
import os
import numpy as np
import pandas as pd
from app.services import ml_engine


def test_continuous_regression_target_detection_and_metrics():
    """
    Scenario 1: Continuous regression target.
    Verifies:
    - Detected as regression.
    - Floating-point variance inspected.
    - Computes min, max, mean, median, std, skewness, quantiles, Tukey outliers (1.5*IQR).
    - 10-bin histogram.
    - Validation strategy: Train/Test Split + K-Fold (No Stratification).
    """
    np.random.seed(42)
    n = 100
    y_vals = np.random.normal(120.5, 15.2, n).clip(70.0, 180.0)
    # Add an intentional Tukey outlier
    y_vals[0] = 230.0

    df = pd.DataFrame({
        "analyte_a": np.random.normal(10, 2, n),
        "analyte_b": np.random.normal(50, 5, n),
        "disease_progression_score": np.round(y_vals, 1)
    })

    res = ml_engine.analyze_target_variable(df, "disease_progression_score")

    assert res["target_column"] == "disease_progression_score"
    assert res["detected_type"] == "regression"
    assert res["effective_type"] == "regression"
    assert res["is_suitable"] is True
    assert res["is_override"] is False
    assert res["validation_strategy"]["is_stratified"] is False
    assert "No Stratification" in res["validation_strategy"]["name"]

    reg = res["regression_metrics"]
    assert reg is not None
    assert reg["min"] == pytest.approx(float(np.min(np.round(y_vals, 1))), rel=1e-3)
    assert reg["max"] == pytest.approx(230.0, rel=1e-3)
    assert reg["outlier_count"] >= 1
    assert "Tukey" in reg["outlier_method"]
    assert len(reg["histogram"]) == 10
    assert "skewness" in reg
    assert reg["q50"] == reg["median"]
    assert reg["iqr"] == pytest.approx(reg["q75"] - reg["q25"], rel=1e-3)


def test_binary_classification_target():
    """
    Scenario 2: Binary classification target.
    Verifies:
    - Discrete 2 classes detected as binary_classification.
    - Class counts, percentages, majority/minority ratio.
    - Stratified validation strategy recommended.
    """
    df = pd.DataFrame({
        "biomarker_x": np.random.normal(5, 1, 60),
        "biomarker_y": np.random.normal(20, 3, 60),
        "pathology_status": ["benign"] * 35 + ["malignant"] * 25
    })

    res = ml_engine.analyze_target_variable(df, "pathology_status")

    assert res["detected_type"] == "binary_classification"
    assert res["effective_type"] == "binary_classification"
    assert res["is_suitable"] is True
    assert res["validation_strategy"]["is_stratified"] is True
    assert "Stratified" in res["validation_strategy"]["name"]

    cls = res["classification_metrics"]
    assert cls is not None
    assert cls["num_classes"] == 2
    assert cls["majority_class"]["class_label"] == "benign"
    assert cls["majority_class"]["count"] == 35
    assert cls["minority_class"]["class_label"] == "malignant"
    assert cls["minority_class"]["count"] == 25
    assert cls["majority_minority_ratio"] == pytest.approx(1.4, rel=1e-1)
    assert cls["has_imbalance"] is False


def test_multiclass_classification_target():
    """
    Scenario 3: Multiclass classification target.
    Verifies:
    - Discrete 3+ classes detected as multiclass_classification.
    - Number of classes = 3.
    - Stratified validation strategy.
    """
    df = pd.DataFrame({
        "feature_1": range(90),
        "ckd_stage": ["Stage 1"] * 30 + ["Stage 2"] * 30 + ["Stage 3"] * 30
    })

    res = ml_engine.analyze_target_variable(df, "ckd_stage")

    assert res["detected_type"] == "multiclass_classification"
    assert res["effective_type"] == "multiclass_classification"
    assert res["validation_strategy"]["is_stratified"] is True

    cls = res["classification_metrics"]
    assert cls["num_classes"] == 3
    assert len(cls["classes"]) == 3
    assert len(cls["bar_chart_data"]) == 3


def test_integer_valued_numerical_target_not_classified_as_categorical():
    """
    Scenario 4: Integer-valued numerical targets.
    Requirement:
    - Integer-valued numerical targets must NOT automatically be classified as categorical.
    - Do not infer binary classification solely because a numerical target has relatively few unique values.
    - Allow an explicit, auditable target-type override.
    """
    # Integer severity score with only 3 unique values: 10, 20, 30
    df = pd.DataFrame({
        "glucose": [90, 105, 110, 120, 130, 95, 140, 150, 160, 100, 115, 125, 135, 145, 155],
        "severity_grade": [10, 20, 30, 10, 20, 30, 10, 20, 30, 10, 20, 30, 10, 20, 30]
    })

    res = ml_engine.analyze_target_variable(df, "severity_grade")

    # MUST be classified as regression to preserve numerical ordering/continuum, NOT categorical!
    assert res["detected_type"] == "regression"
    assert res["effective_type"] == "regression"
    assert res["is_override"] is False
    assert res["regression_metrics"] is not None

    # Now verify explicit auditable clinician override to multiclass classification
    override_res = ml_engine.analyze_target_variable(df, "severity_grade", override_type="multiclass_classification")
    assert override_res["detected_type"] == "regression"
    assert override_res["effective_type"] == "multiclass_classification"
    assert override_res["is_override"] is True
    assert override_res["override_type"] == "multiclass_classification"
    assert "override applied" in override_res["override_reason"]
    assert override_res["validation_strategy"]["is_stratified"] is True
    assert override_res["classification_metrics"] is not None


def test_imbalanced_classification_target_triggers_warning():
    """
    Scenario 5: Imbalanced classification target.
    Verifies:
    - Severe ratio (e.g. 19:1) triggers has_imbalance = True and warning.
    - High imbalance level.
    """
    df = pd.DataFrame({
        "analyte": range(100),
        "rare_adverse_event": [0] * 95 + [1] * 5
    })

    res = ml_engine.analyze_target_variable(df, "rare_adverse_event")

    assert res["detected_type"] == "binary_classification"
    cls = res["classification_metrics"]
    assert cls["has_imbalance"] is True
    assert cls["imbalance_level"] == "HIGH"
    assert cls["majority_minority_ratio"] == 19.0
    assert "Class imbalance detected" in cls["imbalance_warning"]
    assert len(res["suitability_warnings"]) >= 1


def test_missing_target_values_and_suitability_safeguard():
    """
    Scenario 6: Missing target values & Unsuitable targets.
    Verifies:
    - Calculates exact missing count and percentage.
    - Moderate missingness (15%) is tracked.
    - Extreme missingness (>50%) triggers warning.
    - Constant target (1 unique value) is flagged unsuitable for supervised training.
    """
    # 20 missing values out of 100
    y = [float(i) for i in range(80)] + [np.nan] * 20
    df = pd.DataFrame({
        "feat": range(100),
        "target_with_nans": y
    })

    res = ml_engine.analyze_target_variable(df, "target_with_nans")
    assert res["total_count"] == 100
    assert res["missing_count"] == 20
    assert res["missing_percentage"] == 20.0
    assert res["valid_count"] == 80
    assert res["is_suitable"] is True

    # Extreme missingness: 60 missing out of 100
    y_ext = [float(i) for i in range(40)] + [np.nan] * 60
    df_ext = pd.DataFrame({"feat": range(100), "target_ext": y_ext})
    res_ext = ml_engine.analyze_target_variable(df_ext, "target_ext")
    assert any("High missingness" in w for w in res_ext["suitability_warnings"])

    # Constant target (0 variance)
    df_constant = pd.DataFrame({"feat": range(50), "target_const": [1.0] * 50})
    res_const = ml_engine.analyze_target_variable(df_constant, "target_const")
    assert res_const["is_suitable"] is False
    assert any("only 1 distinct value" in w for w in res_const["suitability_warnings"])


def test_target_analysis_api_endpoint(client):
    """
    Verifies the new GET /api/v1/ml/datasets/{id}/target-analysis endpoint
    returns full data-driven distribution, detection, and override capabilities.
    """
    # Login with provisioned admin
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@biochem.ai",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Seed benchmark datasets
    seed_res = client.post("/api/v1/ml/datasets/seed-benchmark", headers=headers)
    assert seed_res.status_code == 200

    # Get dataset list
    list_res = client.get("/api/v1/ml/datasets", headers=headers)
    assert list_res.status_code == 200
    datasets = list_res.json()
    assert len(datasets) > 0

    # Find the diabetic progression cohort (continuous regression target)
    diabetic_ds = next((d for d in datasets if "Diabetic" in d["name"]), datasets[0])
    ds_id = diabetic_ds["id"]

    # 1. Query target-analysis for default target
    res = client.get(f"/api/v1/ml/datasets/{ds_id}/target-analysis", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["target_column"] == "disease_progression_score"
    assert data["detected_type"] == "regression"
    assert data["effective_type"] == "regression"
    assert data["is_suitable"] is True
    assert data["regression_metrics"] is not None
    assert len(data["regression_metrics"]["histogram"]) > 0

    # 2. Test explicit override
    res_override = client.get(
        f"/api/v1/ml/datasets/{ds_id}/target-analysis?override_type=binary_classification",
        headers=headers
    )
    assert res_override.status_code == 200
    override_data = res_override.json()
    assert override_data["is_override"] is True
    assert override_data["effective_type"] == "binary_classification"
    assert "override applied" in override_data["override_reason"]

    # 3. Test detail endpoint includes target_analysis
    detail_res = client.get(f"/api/v1/ml/datasets/{ds_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert "target_analysis" in detail
    assert detail["target_analysis"]["target_column"] == "disease_progression_score"
