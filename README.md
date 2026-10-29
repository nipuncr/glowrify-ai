## Quick demo mode (no sign-in)

For a local classroom/demo run, Glowrify now supports direct guest styling without Supabase email sign-in. It analyses the uploaded photo, uses live weather, applies strict Men/Women catalog filtering, and returns the result to the current browser only. Guest edits are not saved to the account archive or uploaded to Supabase storage. The guest endpoint is enabled only when every configured allowed origin is localhost/127.0.0.1/::1; adding a deployed website origin disables this local demo endpoint.

The catalog cards use real clothing photographs. Recommendations apply a strict Men/Women catalog filter and an extra text-based exclusion for unmistakably women's-only products (such as sarees) that may be mislabeled in data. The result page includes three complete-look suggestions with separate Myntra search links for the top, bottoms, shoes, and accessories. These are search links, not verified individual listings.

# Glowrify — full-stack application

Glowrify combines a Next.js/React frontend, an R3F landing scene, a Python FastAPI computer-vision service, Supabase Auth/PostgreSQL/Storage, and live OpenWeatherMap data.

**There is no runtime demo mode, hardcoded recommendation fallback, sample pose, or simulated forecast.** The browser submits photos to the API, which queries the database and persists the recommendation results. Prices are stored as `price_inr`, constrained to `INR`, and rendered through `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'})`.

This source package contains the implementation and setup tooling. The backend still validates your local `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `OPENWEATHER_API_KEY` settings on startup. For the local guest demo, users do not have to sign in; it uses a small demo catalog and does not save their photos or sessions. Supabase-backed account archives and persistent sessions require a configured Supabase project. The ChatGPT-hosted frontend does not run Python or provision your Supabase account.

## Windows local repair / launch (ports 8081 and 8001)

If you already configured Glowrify on this computer, extract this ZIP **over the existing project folder** so your local `backend/.env` and Python virtual environment remain in place. Do not delete `backend/.env`: it is intentionally excluded from ZIP files because it contains your credentials. Then double-click `START_GLOWRIFY.bat`. It preserves the credential values, adds the local frontend origins to `ALLOWED_ORIGINS`, builds with `NEXT_PUBLIC_API_URL=http://127.0.0.1:8001`, and opens separate backend and frontend windows. Use `http://localhost:8081`; API docs are at `http://127.0.0.1:8001/docs`. Keep both server windows open.

The launcher cannot provision your Supabase project or validate your account-level Supabase Auth settings. If the generic sign-in message remains after launch, the browser/network error or Supabase Auth configuration still needs checking; a successful build alone is not proof of live authentication.

## Quick start

Requirements: Python **3.12**, Node **24**, Docker Compose, a Supabase project, and an OpenWeatherMap current-weather API key.

```bash
python -m venv .setup-venv
# Linux/macOS:
. .setup-venv/bin/activate
# Windows PowerShell instead:
# .\.setup-venv\Scripts\Activate.ps1
pip install -r scripts/requirements.txt
python scripts/setup.py
docker compose up --build
```

Open **http://localhost:8080**. The frontend is served by Nginx and `/api/*` is proxied to FastAPI, so the complete local stack uses one browser origin. Camera access works on localhost; use HTTPS for a deployed domain.

The setup command prompts for:

- Supabase PostgreSQL connection string (direct or session pooler, including the database password).
- Project URL and public anon/publishable key.
- Service-role/secret key used **only during initialization and garment uploads**.
- OpenWeatherMap key.
- Frontend and development API origins.

The database connection string and service-role key are never written to files. Runtime configuration is written to `backend/.env` and `.env.local` with restrictive permissions. Existing configuration is preserved unless you explicitly set `GLOWRIFY_OVERWRITE_CONFIG=1` before rerunning setup. Alternatively, provide the named environment variables documented in `scripts/setup.py` for noninteractive provisioning.

**Optional Supabase account/archive mode:** If you later enable account sign-in and saved session history, set your frontend origin as the Auth Site URL and an allowed redirect URL, enable email sign-in, and configure email delivery. The local guest demo does not need users to sign in.

The initialization script:

1. Creates tables, indexes, constraints, row-level policies, an Auth signup trigger, and private/public Storage buckets.
2. Inserts 12 apparel records, using `ON CONFLICT (sku) DO NOTHING` so reruns do not overwrite edited catalog values.
3. Uploads the included original garment vector artwork to Supabase Storage and updates the corresponding database asset URLs.
4. Writes runtime configuration and provides the launch command.

## Anywear live virtual try-on

The root layout loads the official Anywear storefront widget from Decart, configured for `localhost:8081`. The embedded widget is provided by an external service and its live camera content must load from Anywear; the local app cannot repair an outage or an unaccepted localhost domain on the vendor side. If the floating panel is blank, the visible **Open live try-on** links launch Anywear's official live camera page in a separate tab. The former 2D overlay is no longer presented as the product's live try-on.

If you change the local port, update the `domain` query parameter in `app/layout.tsx` to match the browser address. The `START_GLOWRIFY.bat` launcher uses `localhost:8081` and adds that origin to the backend CORS list while preserving the other settings in `backend/.env`. For a public deployment, use the actual hostname supplied to Anywear instead of `localhost:8080`.

## Project organization

```text
app/
  layout.tsx                  Root layout and metadata
  page.tsx                    Landing page and studio composition
  globals.css                 Tailwind entry and responsive visual styles
components/
  HeroScene.tsx               R3F floating jacket, pointer tracking, lights, fallback
  Studio.tsx                  Authentication, upload/webcam, form, results, archive
  TryOn.tsx                   Pose-driven affine overlay, adjustments, PNG export
  Dialog.tsx                  Focus-managed dialogs and Escape behavior
lib/
  types.ts                    API types and the shared INR formatter
  supabase.ts                 Runtime public configuration, auth, API transport
public/garments/
  glo-001.svg ... glo-014.svg  Original transparent garment artwork
backend/
  app/main.py                 Endpoints, JWT checks, body limits, request orchestration
  app/config.py               Validated server configuration
  app/schemas.py              Profile and location validation
  app/vision.py               MediaPipe and rembg CPU inference
  app/engine.py               Deterministic silhouette rules and ranking
  app/services.py             Supabase REST/Storage and weather service calls
  tests/                     Isolated API and recommendation tests
  download_models.py          Model acquisition during container build
  requirements.txt            Direct requirements + constraints reference
  requirements.lock           Resolved Python 3.12 CPU dependency constraints
  Dockerfile                  Non-root Python service with preloaded models
supabase/
  schema.sql                  Complete repeatable initialization
  seed.sql                    Complete INSERT INTO apparel_catalog statement
scripts/
  setup.py                    Automated database, asset, and configuration setup
  requirements.txt            Setup-only dependencies
  dev.mjs                     Next development server argument adapter
  package_source.py           Rebuild source archive and readable code bundle
  verify_sql.mjs              Isolated PostgreSQL verification (requires PGlite)
deploy/
  Dockerfile.frontend          Static Next.js build + Nginx image
  nginx.conf                  Same-origin API proxy, body limits, rate limits
compose.yaml                  Complete web/API local stack
.github/workflows/checks.yml   Build, TypeScript, and API/rules CI
.env.example                  Frontend configuration names
backend/.env.example          Backend configuration names
```

## Database model

| Table | Purpose and relationships |
|---|---|
| `users` | One row per `auth.users.id`; latest age, height and weight; created automatically on signup. |
| `apparel_catalog` | Products, SKU, INR price, occasions, body shapes, temperature limits, rain protection, sizes, and overlay anchors. |
| `style_sessions` | Owned analysis, landmarks, cutout path, consent version, input profile, occasion, and weather snapshot. |
| `recommendations` | Foreign keys to the session/user and apparel record; ranked explanations and INR price snapshot. |
| `glowrify_quotas` | Atomic daily analysis-attempt counter for each user. |

An owned session and its recommendations are saved in one PostgreSQL function transaction. The function derives ownership from `auth.uid()`. It does not accept a user ID from the client. It stores the price from the catalog rather than trusting an incoming price.

Each request carries a UUID `request_id`; if a saved session already exists for that user and ID, the API returns it. This makes retries after a completed analysis idempotent. The same image upload retried while the original request is still in flight may receive a temporary storage conflict; retry after the first request completes. The database also prevents duplicate session/garment pairs.

Private photos live in `glowrify-photos` under `<user-id>/<session-id>.png`. The original upload is not saved. The processed cutout has EXIF metadata removed. Photo links expire after one hour; reopening an archive entry refreshes its link. A separate public `glowrify-garments` bucket holds catalog artwork. Only the initialization administrator uploads catalog assets.

The new tables use separate names from the first version's `profiles`, `catalog`, and `analyses`. Existing v1 data is not dropped or silently converted. This initialization creates the v2 data model; plan a deliberate migration if you already populated v1 in a real project.

## Preseeded catalog

The seed defines Glowrify's own generic catalog and merchant-set INR prices; it does not claim stock or prices from external retailers. The included product assets are original vector garment renderings, suitable for transparent canvas overlays.

| SKU | Product | Price |
|---|---|---:|
| GLO-001 | Sage Cotton Overshirt | ₹1,799 |
| GLO-002 | Ivory Linen Resort Shirt | ₹1,499 |
| GLO-003 | Navy Tailored Blazer | ₹4,499 |
| GLO-004 | Charcoal Unstructured Blazer | ₹3,799 |
| GLO-005 | Black Satin Evening Shirt | ₹2,199 |
| GLO-006 | Terracotta Mandarin Kurta | ₹1,899 |
| GLO-007 | White Oxford Button-Down | ₹1,699 |
| GLO-008 | Olive Waterproof Shell | ₹2,999 |
| GLO-009 | Ink Rain Commuter Jacket | ₹3,299 |
| GLO-010 | Burgundy Merino Crewneck | ₹2,599 |
| GLO-011 | Stone Pique Polo | ₹1,199 |
| GLO-012 | Teal Performance Tee | ₹899 |

Occasions are `Casual`, `Formal`, `Party`, `Work`, `Travel`, and `Active`. Supported proportion groups are `balanced`, `shoulder-led`, and `hip-led`. The SQL contains each item's material, applicable groups, temperature range, rain protection, source-image anchors, and sizes. Replace or expand these catalog records with your own inventory before using the app as a retail service; checkout and inventory management are outside this application.

## API and complete request flow

`GET /api/config` exposes only the public Supabase URL and anon/publishable key. All other `/api` routes require a valid Supabase bearer access token. The backend verifies that token through Supabase Auth, then carries the same token to database and Storage calls so RLS remains effective. The API runtime does not require a service-role key.

| Method | Endpoint | Behavior |
|---|---|---|
| POST | `/api/analyze-silhouette` | Validates input; gets live weather; runs pose/background inference; queries and ranks apparel; saves session and recommendations; returns the complete edit. |
| GET | `/api/sessions` | Lists the authenticated user's latest 50 sessions. |
| GET | `/api/sessions/{id}` | Restores an owned analysis, persisted recommendations, and a fresh signed photo link. |
| DELETE | `/api/sessions/{id}` | Deletes the owned cutout, session, and dependent recommendations. |
| GET | `/healthz` | Healthy only after model startup completes. |

The analysis endpoint accepts multipart fields:

```text
photo       JPEG, PNG or WebP file, at most 8 MiB
profile     JSON: age, height_cm, weight_kg, occasion
location    JSON: city OR lat and lon
request_id  UUID generated once per form submission/retry sequence
consent     true
```

For example, `profile` may contain `{"age":24,"height_cm":175,"weight_kg":70,"occasion":"Formal"}` and `location` may contain `{"city":"Indore,IN"}`. These illustrate the request schema, not runtime fallback values.

Response shape:

```text
analysis: id, image_url, landmarks[33], world_landmarks[33], silhouette,
          shoulder_hip_ratio, confidence, profile, occasion, created_at
weather:  temp, feels_like, description, city, rain, humidity, wind_mps,
          observed_at, source
items:    database apparel records with price_inr, score, and reasons
```

Weather timestamps are displayed, including when restoring older sessions. Old session weather is a recorded observation, not represented as a fresh forecast. Latitude/longitude are sent transiently to the weather service and not persisted in the session.

## Computer vision and sizing limits

The service accepts only decoded JPEG/PNG/WebP, rejects images smaller than 256 pixels, limits decompressed pixel count, corrects EXIF orientation, and resizes within 1400×1800. It detects up to two people and requires exactly one confident pose. Both shoulders and hips must be visible; heavily turned poses are rejected.

MediaPipe returns 33 image-space landmarks and 33 world-space landmarks. The service calculates Euclidean shoulder and hip widths in world coordinates. Shoulder/hip ratio `>1.15` selects shoulder-led, `<0.90` selects hip-led, otherwise balanced. These are editorial heuristics based on skeletal landmark estimates, not validated measurements of clothing fit or body circumference. No waist-based hourglass/apple classification is invented from shoulder/hip landmarks.

Age, height, and weight are validated and stored as requested. The app lists available garment sizes; it does not invent an exact size from weight or BMI. Actual sizing needs a garment size chart and additional measurements. This avoids presenting an inaccurate clothing size as a computer-vision result.

rembg/u2netp processes the same oriented/resized image, so the returned landmarks align with its transparent cutout. Models load once per worker, and two inference jobs can be admitted per process, with serialized access to shared model instances.

## Recommendation matrix

The API queries `apparel_catalog` through PostgREST with filters for active status, occasion, body-shape array, inclusive temperature range, and water resistance in rain/snow. It paginates matching records. The deterministic Python matrix rechecks those constraints and ranks garments by the distance between the current temperature and the midpoint of the garment's temperature window, with UUID tie-breaking. It returns up to six results with explicit reasons.

If weather fails, the request fails with an actionable error; no weather is fabricated. If no catalog item matches, the persisted session contains an empty recommendation list and the UI explains that no match was found. Failed analysis attempts count toward the 12-attempt daily quota.

## Virtual try-on

The fitting room is placed immediately after the returned recommendation cards and defaults to the first returned garment. The client solves an affine transformation between each garment's three normalized source anchors and the user's detected image-side shoulders and hip midpoint. Scale, vertical offset, and opacity can be adjusted, then the canvas can be exported to PNG.

Use transparent garment assets with accurate, noncollinear shoulder/hip anchors. Remote image hosts must permit canvas cross-origin reads; the setup uploads to Supabase's public asset storage. The included anchor template supports upper-body garments. The overlay does not synthesize fabric drape, arm occlusion, exact size, or trouser geometry. It is a pose-aligned 2D visualization.

Favorites on recommendation cards are session-local UI state. The actual analyses and recommendations persist in PostgreSQL and are accessible in the account archive.

## Development and deployment

```bash
npm ci
npm run dev
```

The generated `.env.local` points development requests to http://localhost:8000. For the container stack the frontend uses same-origin `/api` proxying, and does not embed secrets in the build. For a separate static host, set `NEXT_PUBLIC_API_URL` to your HTTPS API origin before `npm run build`; configure the API's exact allowed frontend origin.

```bash
npm run build
# Deploy out/ to your static host, or use the included web container.
```

For deployment, place the web container behind your platform's HTTPS ingress. Keep the API private behind the proxy where possible. The Nginx configuration enforces upload-size and request-rate limits. The API container runs as a non-root user with one worker and a 3 GB memory limit in Compose. Measure actual memory and latency before changing worker count; every worker loads its own model set.

For local Python development without Docker, install `backend/requirements.txt`, set `U2NET_HOME` to a writable model directory, run `backend/download_models.py`, and set `POSE_MODEL_PATH` to the downloaded `.task` file. From `backend/`, run `uvicorn app.main:app --reload`. Model downloads require access to Google model storage and the official rembg GitHub release.

The pose model URL is versioned. rembg verifies its model download through its own downloader. Python dependencies are constrained to the resolved CPU environment; the frontend has `package-lock.json`. Reassess dependency and model licenses/security as part of your own release process.

## Data lifecycle and operational limits

- Private photo policies constrain all reads/writes/deletes to the JWT owner's folder. Session access and recommendation reads are similarly isolated.
- Catalog writes and price changes are administrator-only; every currency column rejects values other than INR.
- Deleting a session removes its stored cutout first, then the session and recommendations. Deletion does not remove files already downloaded by the user.
- Set a retention period before public launch. A maintenance job should remove expired/unreferenced photo objects through the Storage API before removing their database rows. Do not manipulate `storage.objects` directly in production SQL. Account deletion requires Storage cleanup as well as the database cascades.
- Failed network operations can leave an orphaned photo if the backend cannot confirm whether a database transaction committed. Cleanup is deliberately deferred in that ambiguous case rather than deleting a possibly committed user's image.
- Supabase Auth email delivery, project-level rate limits, storage quotas, backups, and TLS must be configured on the actual project/hosting account. Server logs intentionally omit uploaded photos, precise locations, bearer tokens, and signed URLs.
- RLS prevents access to other users' data. An authenticated client can invoke the save RPC for its own data; this is not a tamper-proof recommendation attestation or billing system. If you add billing, move trusted recommendation writes behind a restricted service role and enforce quota/accounting in the same transaction.

## Verification

```bash
npm run typecheck
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
```

The isolated API tests inject collaborators to exercise error cases and request orchestration. They do not introduce a mock mode in the application. The live API always uses the actual adapters and models.

`verify_sql.mjs` runs the schema in an isolated embedded PostgreSQL instance with minimal Auth/Storage test fixtures. Run `npm run test:db` after `npm ci`; PGlite is a development-only dependency. It checks idempotent initialization, seeds, triggers, quotas, transaction/idempotency behavior, price snapshots, RLS ownership isolation, currency constraints, and cascading deletion. It omits only `CREATE EXTENSION pgcrypto` because the embedded engine already includes `gen_random_uuid()`.

The supplied code was built/type-checked and the API/rule tests were executed. Both vision models loaded locally; MediaPipe rejected a no-person image, and a rembg inference smoke test was run. These checks do not constitute a successful real-user end-to-end test against your Supabase/SMTP/OpenWeatherMap accounts. Browser rendering was inspected, but full interaction verification was blocked by the browser environment. Verify real sign-in, a full-person image, live weather, signed-image CORS/export, and mobile behavior after configuring the actual services.

## References

- https://nextjs.org/docs/app/guides/static-exports
- https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/python
- https://github.com/danielgatis/rembg
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/managing-user-data
- https://openweathermap.org/api/current
