#!/usr/bin/env python3
"""Initialize Supabase SQL, upload catalog assets, and write local runtime configuration.
Privileged DB/storage credentials are read from the environment or a hidden prompt;
they are never written to disk. Run from any directory after installing requirements.
"""
import getpass
import os
from pathlib import Path
from urllib.parse import urlparse
import httpx
import psycopg

ROOT = Path(__file__).resolve().parents[1]


def value(name, prompt, secret=False, default=""):
    existing = os.environ.get(name)
    if existing:
        return existing.strip()
    answer = (getpass.getpass if secret else input)(prompt).strip()
    if not answer and default:
        return default
    if not answer:
        raise SystemExit(f"{name} is required")
    return answer


def envfile(path, entries):
    # Quote dotenv values safely; reject multiline values and never echo secrets.
    for v in entries.values():
        if "\n" in v or "\r" in v:
            raise SystemExit("Multiline environment values are not supported")
    content = (
        "\n".join(
            k + "=" + "'" + v.replace("\\", "\\\\").replace("'", "\\'") + "'"
            for k, v in entries.items()
        )
        + "\n"
    )
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        handle.write(content)
    os.chmod(path, 0o600)


def main():
    for path in (ROOT / "backend/.env", ROOT / ".env.local"):
        if path.exists() and os.environ.get("GLOWRIFY_OVERWRITE_CONFIG") != "1":
            raise SystemExit(
                "Configuration already exists. To deliberately replace it, set GLOWRIFY_OVERWRITE_CONFIG=1."
            )
    db = value(
        "SUPABASE_DB_URL", "Supabase PostgreSQL connection string (hidden): ", True
    )
    url = value("SUPABASE_URL", "Supabase project URL: ").rstrip("/")
    if urlparse(url).scheme != "https":
        raise SystemExit("Supabase requires an HTTPS URL")
    public_key = value(
        "SUPABASE_ANON_KEY", "Supabase public anon/publishable key (hidden): ", True
    )
    service = value(
        "SUPABASE_SERVICE_ROLE_KEY",
        "Supabase service role/secret key for setup only (hidden): ",
        True,
    )
    weather = value("OPENWEATHER_API_KEY", "OpenWeatherMap key (hidden): ", True)
    frontend = value(
        "FRONTEND_ORIGIN",
        "Frontend origin [http://localhost:8080]: ",
        default="http://localhost:8080",
    ).rstrip("/")
    api = value(
        "API_ORIGIN",
        "API origin for npm dev [http://localhost:8000]: ",
        default="http://localhost:8000",
    ).rstrip("/")
    # Supabase session-pooler/direct connection; TLS is mandatory.
    with psycopg.connect(db, sslmode="require", connect_timeout=20) as conn:
        conn.execute((ROOT / "supabase/schema.sql").read_text(), prepare=False)
        conn.execute((ROOT / "supabase/seed.sql").read_text(), prepare=False)
    headers = {"apikey": service, "Content-Type": "image/svg+xml", "x-upsert": "true"}
    if service.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {service}"
    with httpx.Client(timeout=30) as client, psycopg.connect(
        db, sslmode="require", connect_timeout=20
    ) as conn:
        for asset in sorted((ROOT / "public/garments").glob("glo-*.svg")):
            response = client.post(
                f"{url}/storage/v1/object/glowrify-garments/{asset.name}",
                headers=headers,
                content=asset.read_bytes(),
            )
            if response.is_error:
                raise SystemExit(
                    f"Asset upload failed: {asset.name} (HTTP {response.status_code}). Setup can be rerun safely."
                )
            public_url = (
                f"{url}/storage/v1/object/public/glowrify-garments/{asset.name}"
            )
            conn.execute(
                "update public.apparel_catalog set image_url=%s,overlay_url=%s where sku=%s",
                (public_url, public_url, asset.stem.upper()),
            )
        count = conn.execute(
            "select count(*) from public.apparel_catalog where active"
        ).fetchone()[0]
    envfile(
        ROOT / "backend/.env",
        {
            "SUPABASE_URL": url,
            "SUPABASE_ANON_KEY": public_key,
            "OPENWEATHER_API_KEY": weather,
            "ALLOWED_ORIGINS": f"{frontend},http://localhost:3000,http://localhost:8080",
            "POSE_MODEL_PATH": "/models/pose_landmarker_lite.task",
            "U2NET_HOME": "/models",
        },
    )
    envfile(ROOT / ".env.local", {"NEXT_PUBLIC_API_URL": api})
    print(
        f"Initialized schema and {count} active catalog records. Catalog artwork uploaded."
    )
    print(
        "Set the frontend origin as your Supabase Auth Site URL and allowed redirect URL."
    )
    print("Run: docker compose up --build")
    print(
        "Open http://localhost:8080. For frontend development, run npm ci && npm run dev."
    )


if __name__ == "__main__":
    try:
        main()
    except (httpx.HTTPError, psycopg.Error):
        raise SystemExit(
            "Setup could not reach or initialize Supabase. Verify the project, permissions and connection details. No credentials were printed."
        )
