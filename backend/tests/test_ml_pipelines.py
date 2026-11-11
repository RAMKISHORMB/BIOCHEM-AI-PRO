from fastapi import status

def get_auth_token(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@biochem.ai",
        "password": "Password123!"
    })
    if res.status_code == 200:
        return res.json()["access_token"]
    client.post("/api/v1/auth/register", json={
        "email": "ml.engineer@biochem.ai",
        "password": "Password123!",
        "full_name": "ML Engineer",
        "role": "CLINICIAN"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "ml.engineer@biochem.ai",
        "password": "Password123!"
    })
    return res.json()["access_token"]

def test_dataset_seeding_and_summary(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Seed dataset
    res = client.post("/api/v1/ml/datasets/seed-benchmark", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    ds = res.json()
    assert ds["row_count"] >= 200
    assert "GLU" in ds["feature_columns"]

    # Get dataset stats
    detail_res = client.get(f"/api/v1/ml/datasets/{ds['id']}", headers=headers)
    assert detail_res.status_code == status.HTTP_200_OK
    stats = detail_res.json()["summary_stats"]
    assert "GLU" in stats
    assert stats["GLU"]["mean"] > 50.0

def test_model_training_and_prediction(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure dataset
    ds = client.post("/api/v1/ml/datasets/seed-benchmark", headers=headers).json()

    # Train model
    train_payload = {
        "dataset_id": ds["id"],
        "model_name": "Clinical Risk Random Forest v1",
        "algorithm": "RandomForestClassifier",
        "test_size": 0.2,
        "hyperparameters": {"n_estimators": 50, "max_depth": 5}
    }
    train_res = client.post("/api/v1/ml/models/train", json=train_payload, headers=headers)
    assert train_res.status_code == status.HTTP_201_CREATED
    model = train_res.json()
    assert model["name"] == "Clinical Risk Random Forest v1"
    assert model["algorithm"] == "RandomForestClassifier"

    metrics = model["metrics"]
    assert metrics["accuracy"] >= 0.70  # Real calculated accuracy
    assert "confusion_matrix" in metrics
    assert len(metrics["confusion_matrix"]) == 2

    # Predict and explain
    pred_res = client.post("/api/v1/ml/models/predict", json={
        "model_id": model["id"],
        "features": {
            "GLU": 220.0,
            "CREAT": 2.8,
            "BUN": 45.0,
            "NA": 134.0,
            "K": 5.8,
            "ALT": 40.0,
            "AST": 35.0,
            "ALB": 3.1
        }
    }, headers=headers)
    assert pred_res.status_code == status.HTTP_200_OK
    pred_data = pred_res.json()
    assert "predicted_class" in pred_data
    assert len(pred_data["feature_attributions"]) == 8
    assert "explanation_summary" in pred_data

def test_untrained_model_rejection(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/ml/models/non-existent-model-id", headers=headers)
    assert res.status_code == status.HTTP_404_NOT_FOUND
    assert "not trained" in res.json()["detail"].lower()

def test_anomaly_detection(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Extreme multidimensional outlier
    res = client.post("/api/v1/ml/anomaly-check", json={
        "features": {
            "GLU": 550.0,
            "CREAT": 8.0,
            "BUN": 150.0,
            "NA": 115.0,
            "K": 7.2,
            "ALT": 300.0,
            "AST": 280.0,
            "ALB": 1.5
        }
    }, headers=headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["is_anomaly"] is True
    assert len(data["flagged_features"]) >= 1
