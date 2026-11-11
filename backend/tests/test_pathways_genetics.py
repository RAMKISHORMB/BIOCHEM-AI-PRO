from fastapi import status

def get_auth_token(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@biochem.ai",
        "password": "Password123!"
    })
    if res.status_code == 200:
        return res.json()["access_token"]
    client.post("/api/v1/auth/register", json={
        "email": "geneticist@biochem.ai",
        "password": "Password123!",
        "full_name": "Dr. Rosalind Franklin",
        "role": "CLINICIAN"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "geneticist@biochem.ai",
        "password": "Password123!"
    })
    return res.json()["access_token"]

def test_metabolic_pathways_retrieval(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/pathways", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "pathways" in data
    assert len(data["pathways"]) >= 5

    glycolysis = next(p for p in data["pathways"] if p["id"] == "glycolysis-gluconeogenesis")
    assert glycolysis["name"] == "Glycolysis & Gluconeogenesis"
    assert any(n["name"] == "Hexokinase / Glucokinase" for n in glycolysis["nodes"])

def test_inborn_errors_search(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Search for PKU by gene symbol
    res = client.get("/api/v1/genetics/inborn-errors?search=PAH", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total"] == 1
    assert data["results"][0]["gene_symbol"] == "PAH"
    assert "Phenylketonuria" in data["results"][0]["disorder_name"]

    # Search for Wilson disease by copper
    res_cu = client.get("/api/v1/genetics/inborn-errors?search=Wilson", headers=headers)
    assert res_cu.status_code == status.HTTP_200_OK
    assert res_cu.json()["results"][0]["gene_symbol"] == "ATP7B"
