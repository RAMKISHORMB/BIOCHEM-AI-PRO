from fastapi import status

def get_auth_token(client):
    client.post("/api/v1/auth/register", json={
        "email": "ai.reviewer@biochem.ai",
        "password": "Password123!",
        "full_name": "AI Reviewer",
        "role": "ADMIN"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "ai.reviewer@biochem.ai",
        "password": "Password123!"
    })
    return res.json()["access_token"]

def test_knowledge_base_search(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Query knowledge base
    res = client.get("/api/v1/knowledge/search?q=anion gap acidosis", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["results_count"] >= 1
    top_hit = data["citations"][0]
    assert "Anion Gap" in top_hit["title"]
    assert "Tietz" in top_hit["source"]

def test_ai_status_endpoint(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/ai/status", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "online" in data
    assert "default_model" in data
    assert "url" in data

def test_ai_chat_offline_safeguard(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # When Ollama is offline locally, the endpoint must return 503 instead of faking a response
    res = client.post("/api/v1/ai/chat", json={
        "message": "Explain the biochemical basis of diabetic ketoacidosis.",
        "include_rag": True
    }, headers=headers)

    # If Ollama is not running on test machine, it safely raises 503 without fabricating
    if res.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        detail = res.json()["detail"]
        assert "Ollama" in detail
        assert "never fabricated" in detail or "unavailable" in detail
    else:
        # If Ollama happens to be active locally
        assert res.status_code == status.HTTP_200_OK
