from fastapi.testclient import TestClient

from sam_backend.main import app


def test_health_is_public():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "sam-local-backend"


def test_protected_endpoint_requires_configured_token(monkeypatch):
    monkeypatch.delenv("SAM_LOCAL_API_TOKEN", raising=False)
    response = TestClient(app).get("/api/system")
    assert response.status_code == 503


def test_protected_endpoint_rejects_wrong_token(monkeypatch):
    monkeypatch.setenv("SAM_LOCAL_API_TOKEN", "a" * 40)
    response = TestClient(app).get("/api/system", headers={"Authorization": "Bearer " + "b" * 40})
    assert response.status_code == 401


def test_protected_endpoint_accepts_correct_token(monkeypatch):
    monkeypatch.setenv("SAM_LOCAL_API_TOKEN", "a" * 40)
    response = TestClient(app).get("/api/system", headers={"Authorization": "Bearer " + "a" * 40})
    assert response.status_code == 200
    assert "cpu_percent" in response.json()
