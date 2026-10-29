"""Isolated API tests use injected collaborators; no test doubles exist in runtime code."""

import json
from uuid import uuid4
from fastapi.testclient import TestClient
from fastapi import HTTPException
import pytest
from app.main import app, current_user
from app import main

UID = "00000000-0000-4000-8000-000000000099"
PROFILE = json.dumps(
    {"age": 24, "height_cm": 175, "weight_kg": 70, "occasion": "Formal"}
)


class Repo:
    def __init__(self, allow=False):
        self.calls = []
        self.allow = allow
        self.saved = None

    async def session(self, uid, session_id):
        self.calls.append(("session", uid, str(session_id)))
        return self.saved

    async def call(self, method, path, **kw):
        self.calls.append((method, path, kw))
        if path.endswith("glowrify_consume_quota"):
            return self.allow
        if path.endswith("glowrify_save_session"):
            data = kw["json"]
            self.saved = {
                "id": data["p_id"],
                "user_id": UID,
                "image_path": data["p_image_path"],
                **data["p_vision"],
            }
        return []

    async def matching_catalog(self, occasion, gender):
        return []

    async def response(self, row):
        return {"analysis": row, "items": [], "weather": {"temp": 20}}


@pytest.fixture
def repo():
    r = Repo()
    app.dependency_overrides[current_user] = lambda: (UID, r)
    yield r
    app.dependency_overrides.clear()


def post(client, **data):
    return client.post(
        "/api/analyze-silhouette",
        data={
            "profile": PROFILE,
            "consent": "true",
            "request_id": str(uuid4()),
            "location": '{"city":"Indore,IN"}',
            **data,
        },
        files={"photo": ("image.png", b"png", "image/png")},
    )


def test_auth_required():
    assert TestClient(app).get("/api/sessions").status_code in (401, 403)


def test_consent_and_profile_validation(repo):
    c = TestClient(app)
    assert post(c, consent="false").status_code == 422
    assert post(c, profile=PROFILE.replace("24", "12")).status_code == 422
    assert post(c, location='{"lat":30}').status_code == 422


def test_quota_before_inference(repo):
    assert post(TestClient(app)).status_code == 429


def test_size_limit():
    assert (
        TestClient(app)
        .post("/api/analyze-silhouette", content=b"x" * (9 * 1024 * 1024 + 1))
        .status_code
        == 413
    )


def test_owner_scope(repo):
    c = TestClient(app)
    for method in ("get", "delete"):
        assert getattr(c, method)("/api/sessions/" + str(uuid4())).status_code == 404
        assert repo.calls[-1][1] == UID


def test_weather_failure_stops_pipeline(repo, monkeypatch):
    repo.allow = True

    async def unavailable(_):
        raise HTTPException(503, "Weather unavailable")

    monkeypatch.setattr(main, "live_weather", unavailable)
    assert post(TestClient(app)).status_code == 503
    assert not any("/storage/" in str(c) for c in repo.calls)


def test_atomic_result_flow_and_idempotency(repo, monkeypatch):
    repo.allow = True

    async def weather(_):
        return {"temp": 20, "rain": False}

    monkeypatch.setattr(main, "live_weather", weather)

    class Vision:
        def analyze(self, _):
            return {
                "png": b"cutout",
                "silhouette": "balanced",
                "shoulder_hip_ratio": 1,
                "confidence": 0.9,
                "landmarks": [{}] * 33,
                "world_landmarks": [{}] * 33,
            }

    app.state.vision = Vision()
    c = TestClient(app)
    request_id = str(uuid4())
    first = post(c, request_id=request_id)
    assert first.status_code == 201
    writes = [
        call
        for call in repo.calls
        if call[0] == "POST" and call[1].endswith("glowrify_save_session")
    ]
    assert len(writes) == 1 and writes[0][2]["json"]["p_items"] == []
    second = post(c, request_id=request_id)
    assert second.status_code == 201
    assert (
        len(
            [
                call
                for call in repo.calls
                if call[0] == "POST" and call[1].endswith("glowrify_save_session")
            ]
        )
        == 1
    )



def test_guest_demo_needs_no_auth_and_does_not_persist(monkeypatch):
    async def weather(_):
        return {"temp": 24, "rain": False, "description": "clear", "city": "Indore", "observed_at": 1}

    class Vision:
        def analyze(self, _):
            return {
                "png": b"cutout",
                "silhouette": "balanced",
                "shoulder_hip_ratio": 1,
                "confidence": 0.9,
                "landmarks": [{"x": 0.5, "y": 0.5, "z": 0, "visibility": 0.99}] * 33,
                "world_landmarks": [{"x": 0, "y": 0, "z": 0}] * 33,
            }

    monkeypatch.setattr(main, "live_weather", weather)
    app.state.vision = Vision()
    c = TestClient(app)
    response = c.post(
        "/api/guest/analyze-silhouette",
        data={
            "profile": json.dumps({"age": 24, "height_cm": 175, "weight_kg": 70, "occasion": "Casual", "gender": "Men"}),
            "consent": "true",
            "request_id": str(uuid4()),
            "location": '{"city":"Indore,IN"}',
        },
        files={"photo": ("image.png", b"png", "image/png")},
    )
    assert response.status_code == 201, response.text
    result = response.json()
    assert result["analysis"]["image_url"].startswith("data:image/png;base64,")
    assert result["items"]
    assert all(item["gender"] in ("Men", "Unisex") for item in result["items"])
