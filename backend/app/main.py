from contextlib import asynccontextmanager
from base64 import b64encode
from datetime import datetime, timezone
from time import monotonic
from uuid import UUID
import logging
import httpx
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
    Request,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from starlette.responses import JSONResponse
from .config import settings
from .schemas import Profile, Location
from .services import Repository, live_weather
from .demo_catalog import DEMO_CATALOG
from .engine import recommend
from .vision import Vision, VisionError

log = logging.getLogger("glowrify")


@asynccontextmanager
async def lifespan(app):
    app.state.vision = await run_in_threadpool(Vision, settings().pose_model_path)
    yield
    app.state.vision.close()


app = FastAPI(title="Glowrify API", version="2.0.0", lifespan=lifespan)


class BodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in ("POST", "PUT", "PATCH"):
            return await self.app(scope, receive, send)
        body = bytearray()
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            body.extend(event.get("body", b""))
            if len(body) > 9 * 1024 * 1024:
                return await JSONResponse(
                    {"detail": "Upload exceeds the 9 MB request limit."}, 413
                )(scope, receive, send)
            if not event.get("more_body"):
                break
        sent = False

        async def replay():
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


app.add_middleware(BodyLimit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
bearer = HTTPBearer()


async def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    token = credentials.credentials
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                settings().supabase_url + "/auth/v1/user",
                headers={
                    "apikey": settings().supabase_anon_key,
                    "Authorization": f"Bearer {token}",
                },
            )
        if r.status_code in (401, 403):
            raise HTTPException(401, "Please sign in again.")
        if r.is_error:
            raise HTTPException(503, "Sign-in verification is temporarily unavailable.")
        return str(UUID(r.json()["id"])), Repository(token)
    except httpx.RequestError:
        raise HTTPException(503, "Sign-in verification is temporarily unavailable.")
    except (KeyError, ValueError):
        raise HTTPException(401, "Invalid session.")


@app.get("/healthz")
def health():
    return {"status": "ok"}


@app.get("/api/config")
def public_config():
    return {
        "supabase_url": settings().supabase_url,
        "supabase_anon_key": settings().supabase_anon_key,
    }




# Best-effort in-process limit for the local, non-persistent guest demo.
_guest_usage = {}
_GUEST_WINDOW_SECONDS = 24 * 60 * 60
_GUEST_LIMIT_PER_WINDOW = 12


def _check_guest_limit(client_key: str):
    now = monotonic()
    hits = [stamp for stamp in _guest_usage.get(client_key, []) if now - stamp < _GUEST_WINDOW_SECONDS]
    if len(hits) >= _GUEST_LIMIT_PER_WINDOW:
        raise HTTPException(429, "The local demo limit of 12 styling sessions per day has been reached.")
    hits.append(now)
    _guest_usage[client_key] = hits


@app.post("/api/guest/analyze-silhouette", status_code=201)
async def guest_analyze_silhouette(
    request: Request,
    photo: UploadFile = File(...),
    profile: str = Form(...),
    location: str = Form(...),
    request_id: UUID = Form(...),
    consent: bool = Form(...),
):
    """Local classroom demo: no account needed; photo and result are not persisted."""
    if not settings().guest_demo_enabled:
        raise HTTPException(404, "Guest mode is only enabled for a local demo setup.")
    _check_guest_limit(request.client.host if request.client else "local-demo")
    if not consent:
        raise HTTPException(422, "Consent is required to process your photo.")
    try:
        details = Profile.model_validate_json(profile)
        place = Location.model_validate_json(location)
    except ValidationError:
        raise HTTPException(422, "Please check your age, height, weight, occasion, and location.")
    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(415, "Choose a JPEG, PNG, or WebP photo.")
    raw = await photo.read(8 * 1024 * 1024 + 1)
    await photo.close()
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(413, "Photo must be smaller than 8 MB.")
    weather = await live_weather(place)
    try:
        vision = await run_in_threadpool(request.app.state.vision.analyze, raw)
    except VisionError as exc:
        raise HTTPException(422, str(exc))
    except Exception:
        log.error("Guest demo vision processing failed")
        raise HTTPException(503, "We could not process this photo. Please retry with another photo.")
    cutout = vision.pop("png")
    items = recommend(DEMO_CATALOG, vision["silhouette"], details.occasion, weather, details.gender)
    # Guest results stay in this browser only; use a data URL instead of uploading the photo.
    return {
        "analysis": {
            "id": str(request_id),
            "image_url": "data:image/png;base64," + b64encode(cutout).decode("ascii"),
            "landmarks": vision["landmarks"],
            "world_landmarks": vision["world_landmarks"],
            "silhouette": vision["silhouette"],
            "shoulder_hip_ratio": vision["shoulder_hip_ratio"],
            "confidence": vision["confidence"],
            "profile": details.model_dump(),
            "occasion": details.occasion,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        "items": items,
        "weather": weather,
    }


@app.post("/api/analyze-silhouette", status_code=201)
async def analyze_silhouette(
    request: Request,
    photo: UploadFile = File(...),
    profile: str = Form(...),
    location: str = Form(...),
    request_id: UUID = Form(...),
    consent: bool = Form(...),
    user=Depends(current_user),
):
    uid, repo = user
    if not consent:
        raise HTTPException(422, "Consent is required to process your photo.")
    try:
        details = Profile.model_validate_json(profile)
        place = Location.model_validate_json(location)
    except ValidationError:
        raise HTTPException(
            422, "Please check your age, height, weight, occasion, and location."
        )
    prior = await repo.session(uid, request_id)
    if prior:
        await photo.close()
        return await repo.response(prior)
    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(415, "Choose a JPEG, PNG, or WebP photo.")
    raw = await photo.read(8 * 1024 * 1024 + 1)
    await photo.close()
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(413, "Photo must be smaller than 8 MB.")
    if not await repo.call("POST", "/rest/v1/rpc/glowrify_consume_quota", json={}):
        raise HTTPException(
            429, "Your daily limit of 12 analyses is reached. Please return tomorrow."
        )
    weather = await live_weather(place)
    try:
        vision = await run_in_threadpool(request.app.state.vision.analyze, raw)
    except VisionError as exc:
        raise HTTPException(422, str(exc))
    except Exception:
        log.error("Vision processing failed")
        raise HTTPException(
            503, "We could not process this photo. Please retry with another photo."
        )
    png = vision.pop("png")
    catalog = await repo.matching_catalog(details.occasion, details.gender)
    items = recommend(catalog, vision["silhouette"], details.occasion, weather, details.gender)
    image_path = f"{uid}/{request_id}.png"
    await repo.call(
        "POST",
        f"/storage/v1/object/glowrify-photos/{image_path}",
        content=png,
        headers={"Content-Type": "image/png"},
    )
    try:
        await repo.call(
            "POST",
            "/rest/v1/rpc/glowrify_save_session",
            json={
                "p_id": str(request_id),
                "p_image_path": image_path,
                "p_profile": details.model_dump(),
                "p_vision": vision,
                "p_weather": weather,
                "p_items": [
                    {"id": i["id"], "score": i["score"], "reasons": i["reasons"]}
                    for i in items
                ],
            },
        )
    except HTTPException:
        # A network failure may happen after commit. Never delete a committed session's image.
        try:
            if not await repo.session(uid, request_id):
                await repo.call(
                    "DELETE",
                    "/storage/v1/object/glowrify-photos",
                    json={"prefixes": [image_path]},
                )
        except HTTPException:
            log.warning("Deferred storage cleanup may be required")
        raise
    row = await repo.session(uid, request_id)
    if not row:
        raise HTTPException(503, "Your edit could not be loaded. Please retry.")
    return await repo.response(row)


@app.get("/api/sessions")
async def history(user=Depends(current_user)):
    uid, repo = user
    return await repo.call(
        "GET",
        "/rest/v1/style_sessions",
        params={
            "user_id": f"eq.{uid}",
            "select": "id,silhouette,occasion,created_at",
            "order": "created_at.desc",
            "limit": "50",
        },
    )


@app.get("/api/sessions/{session_id}")
async def session(session_id: UUID, user=Depends(current_user)):
    uid, repo = user
    row = await repo.session(uid, session_id)
    if not row:
        raise HTTPException(404, "Styling session not found.")
    return await repo.response(row)


@app.delete("/api/sessions/{session_id}", status_code=204)
async def delete_session(session_id: UUID, user=Depends(current_user)):
    uid, repo = user
    row = await repo.session(uid, session_id)
    if not row:
        raise HTTPException(404, "Styling session not found.")
    await repo.call(
        "DELETE",
        "/storage/v1/object/glowrify-photos",
        json={"prefixes": [row["image_path"]]},
    )
    await repo.call(
        "DELETE",
        "/rest/v1/style_sessions",
        params={"id": f"eq.{session_id}", "user_id": f"eq.{uid}"},
    )
    return Response(status_code=204)
