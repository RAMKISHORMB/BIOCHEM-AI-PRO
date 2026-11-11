import io
import json
import zipfile
import pytest
from fastapi import status
from app.services import ml_engine

def get_auth_token(client):
    client.post("/api/v1/auth/register", json={
        "email": "lead.ml@biochem.ai",
        "password": "Password123!",
        "full_name": "Lead ML Researcher",
        "role": "ADMIN"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "lead.ml@biochem.ai",
        "password": "Password123!"
    })
    return res.json()["access_token"]

def test_csv_upload_and_profiling(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    csv_content = (
        "GLU,CREAT,BUN,ALT,status_risk\n"
        "95.0,0.9,14.0,22.0,0\n"
        "102.0,1.0,16.0,25.0,0\n"
        "210.0,2.8,45.0,75.0,1\n"
        "230.0,3.1,52.0,88.0,1\n"
        "99.0,0.8,12.0,20.0,0\n"
        "185.0,2.2,38.0,60.0,1\n"
    )

    files = {"file": ("cohort_data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    data = {
        "name": "Custom Uploaded Renal Cohort",
        "description": "Validation test dataset",
        "target_column": "status_risk",
        "dataset_type": "RESEARCH"
    }

    res = client.post("/api/v1/ml/datasets/upload", headers=headers, files=files, data=data)
    assert res.status_code == status.HTTP_201_CREATED
    ds = res.json()
    assert ds["name"] == "Custom Uploaded Renal Cohort"
    assert ds["target_column"] == "status_risk"
    assert "GLU" in ds["feature_columns"]
    assert ds["row_count"] == 6
    assert ds["completeness_score"] == 100.0
    assert "GLU" in ds["stats_numerical"]
    assert ds["stats_numerical"]["GLU"]["mean"] > 100.0

def test_xlsx_upload_and_profiling(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        ss_xml = (
            '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<si><t>analyte_x</t></si><si><t>analyte_y</t></si><si><t>decompensation</t></si>'
            '</sst>'
        )
        z.writestr("xl/sharedStrings.xml", ss_xml)
        sheet_xml = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData>'
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>'
            '<row r="2"><c r="A2"><v>12.5</v></c><c r="B2"><v>45.2</v></c><c r="C2"><v>0</v></c></row>'
            '<row r="3"><c r="A3"><v>35.8</v></c><c r="B3"><v>98.1</v></c><c r="C3"><v>1</v></c></row>'
            '<row r="4"><c r="A4"><v>14.1</v></c><c r="B4"><v>48.0</v></c><c r="C4"><v>0</v></c></row>'
            '<row r="5"><c r="A5"><v>42.0</v></c><c r="B5"><v>110.5</v></c><c r="C5"><v>1</v></c></row>'
            '</sheetData></worksheet>'
        )
        z.writestr("xl/worksheets/sheet1.xml", sheet_xml)

    files = {"file": ("biomarkers.xlsx", io.BytesIO(buf.getvalue()), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {
        "name": "Excel Biomarker Registry",
        "description": "Validation test for native xlsx parser",
        "target_column": "decompensation",
        "dataset_type": "CLINICAL"
    }

    res = client.post("/api/v1/ml/datasets/upload", headers=headers, files=files, data=data)
    assert res.status_code == status.HTTP_201_CREATED
    ds = res.json()
    assert ds["file_format"] == "xlsx"
    assert ds["row_count"] == 4
    assert "analyte_x" in ds["feature_columns"]

def test_regression_pipeline_training(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure benchmark datasets seeded
    client.post("/api/v1/ml/datasets/seed-benchmark", headers=headers)
    datasets = client.get("/api/v1/ml/datasets", headers=headers).json()
    prog_ds = next((d for d in datasets if "Progression" in d["name"]), datasets[0])

    # Train Linear Regression model
    payload = {
        "dataset_id": prog_ds["id"],
        "model_name": "Diabetic Progression Linear Regressor",
        "algorithm": "LinearRegression",
        "task_type": "regression",
        "test_size": 0.25,
        "cv_folds": 3
    }
    train_res = client.post("/api/v1/ml/models/train", json=payload, headers=headers)
    assert train_res.status_code == status.HTTP_201_CREATED
    model = train_res.json()
    assert model["algorithm"] == "LinearRegression"
    assert model["task_type"] == "regression"
    assert model["status"] == "TRAINED"

    metrics = model["metrics"]
    assert "mae" in metrics
    assert "mse" in metrics
    assert "rmse" in metrics
    assert "r2_score" in metrics
    assert metrics["mae"] > 0.0

def test_explainability_and_shap_prediction(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/ml/datasets/seed-benchmark", headers=headers)
    datasets = client.get("/api/v1/ml/datasets", headers=headers).json()
    clf_ds = datasets[0]

    # Train Logistic Regression model
    payload = {
        "dataset_id": clf_ds["id"],
        "model_name": "Logistic Risk Screener",
        "algorithm": "LogisticRegression",
        "task_type": "classification",
        "test_size": 0.2,
        "cv_folds": 3
    }
    train_res = client.post("/api/v1/ml/models/train", json=payload, headers=headers)
    model = train_res.json()

    # Predict & explain
    sample_features = {f: 120.0 for f in model["feature_names"]}
    pred_res = client.post("/api/v1/ml/models/predict", json={
        "model_id": model["id"],
        "features": sample_features
    }, headers=headers)
    assert pred_res.status_code == status.HTTP_200_OK
    pred_data = pred_res.json()
    assert "probability" in pred_data
    assert "shap_base_value" in pred_data
    assert len(pred_data["feature_attributions"]) == len(model["feature_names"])
    assert "statutory_disclaimer" in pred_data
    assert "causation" in pred_data["statutory_disclaimer"].lower()


def test_model_persistence_and_registry(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/ml/datasets/seed-benchmark", headers=headers)
    datasets = client.get("/api/v1/ml/datasets", headers=headers).json()
    ds = next((d for d in datasets if "Renal" in d["name"] or "Risk" in d["name"] or "Breast" in d["name"]), datasets[0])

    # Train Decision Tree
    payload = {
        "dataset_id": ds["id"],
        "model_name": "Persistent Decision Tree Clinical Screener",
        "algorithm": "DecisionTreeClassifier",
        "task_type": "classification",
        "test_size": 0.2,
        "cv_folds": 3
    }
    train_res = client.post("/api/v1/ml/models/train", json=payload, headers=headers)
    assert train_res.status_code == status.HTTP_201_CREATED
    model = train_res.json()
    model_id = model["id"]

    # Verify model is in registry with status TRAINED
    reg_res = client.get(f"/api/v1/ml/models/{model_id}", headers=headers)
    assert reg_res.status_code == status.HTTP_200_OK
    reg_data = reg_res.json()
    assert reg_data["status"] == "TRAINED"
    assert "metrics" in reg_data
    assert "accuracy" in reg_data["metrics"]

    # Verify artifact download
    art_res = client.get(f"/api/v1/ml/models/{model_id}/artifact", headers=headers)
    assert art_res.status_code == status.HTTP_200_OK
    assert len(art_res.content) > 100  # Joblib binary artifact
