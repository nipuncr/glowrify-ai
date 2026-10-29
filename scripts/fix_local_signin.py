"""Prepare local Glowrify config for the documented Windows ports without touching secrets."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "backend" / ".env"
if not ENV.is_file():
    print("ERROR: backend/.env is missing.")
    print("Keep your existing backend/.env when updating the project; it contains your local credentials.")
    print("Do not share that file. Copy backend/.env.example to backend/.env and fill your own values only if you no longer have it.")
    sys.exit(2)

text = ENV.read_text(encoding="utf-8-sig")
required = ("SUPABASE_URL", "SUPABASE_ANON_KEY", "OPENWEATHER_API_KEY")
missing = []
for key in required:
    match = re.search(rf"(?m)^\s*{re.escape(key)}\s*=\s*(.*?)\s*$", text)
    if not match or not match.group(1) or match.group(1).startswith("#"):
        missing.append(key)
if missing:
    print("ERROR: backend/.env is missing values for: " + ", ".join(missing))
    print("I left your file unchanged. Fill these values locally; do not send them to anyone.")
    sys.exit(2)

origins = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]
match = re.search(r"(?m)^\s*ALLOWED_ORIGINS\s*=.*$", text)
line = "ALLOWED_ORIGINS=" + ",".join(origins)
if match:
    text = text[:match.start()] + line + text[match.end():]
else:
    if text and not text.endswith("\n"):
        text += "\n"
    text += line + "\n"
ENV.write_text(text, encoding="utf-8")
print("Local API origins updated. Existing Supabase and weather credentials were preserved.")
