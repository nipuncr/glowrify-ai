import httpx
from fastapi import HTTPException
from .config import settings


class Repository:
    """JWT is validated before construction and propagated to PostgREST and Storage RLS."""

    def __init__(self, token: str):
        self.base = settings().supabase_url
        self.headers = {
            "apikey": settings().supabase_anon_key,
            "Authorization": f"Bearer {token}",
        }

    async def call(self, method, path, **kwargs):
        headers = {**self.headers, **kwargs.pop("headers", {})}
        try:
            async with httpx.AsyncClient(timeout=25) as client:
                response = await client.request(
                    method, self.base + path, headers=headers, **kwargs
                )
        except httpx.RequestError:
            raise HTTPException(
                503, "Unable to reach your saved wardrobe. Please try again."
            )
        if response.status_code in (401, 403):
            raise HTTPException(401, "Your session has expired. Please sign in again.")
        if response.is_error:
            raise HTTPException(
                503, "Unable to complete the wardrobe operation. Please try again."
            )
        return response.json() if response.content else None

    async def signed_image(self, path):
        data = await self.call(
            "POST",
            f"/storage/v1/object/sign/glowrify-photos/{path}",
            json={"expiresIn": 3600},
        )
        url = data["signedURL"]
        return url if url.startswith("https://") else self.base + "/storage/v1" + url

    async def session(self, uid, session_id):
        rows = await self.call(
            "GET",
            "/rest/v1/style_sessions",
            params={"id": f"eq.{session_id}", "user_id": f"eq.{uid}", "limit": "1"},
        )
        return rows[0] if rows else None

    async def response(self, row):
        records = await self.call(
            "GET",
            "/rest/v1/recommendations",
            params={
                "session_id": f'eq.{row["id"]}',
                "user_id": f'eq.{row["user_id"]}',
                "select": "rank,score,reasons,price_inr,apparel:apparel_catalog(*)",
                "order": "rank.asc",
            },
        )
        items = [
            {
                **record["apparel"],
                "price_inr": record["price_inr"],
                "score": record["score"],
                "reasons": record["reasons"],
            }
            for record in records
            if record["apparel"]
        ]
        return {
            "analysis": {
                **row,
                "image_url": await self.signed_image(row["image_path"]),
            },
            "items": items,
            "weather": row["weather"],
        }

    async def matching_catalog(self, occasion, gender):
        audience = "Men" if gender != "Women" else "Women"
        params = {
            "select": "*",
            "active": "eq.true",
            "occasions": f"cs.{{{occasion}}}",
            "gender": f"in.({audience},Unisex)",
            "order": "id.asc",
        }
        # Paginate rather than silently truncating a growing catalog at 1,000 rows.
        rows = []
        for offset in range(0, 10000, 500):
            page = await self.call(
                "GET",
                "/rest/v1/apparel_catalog",
                params={**params, "offset": str(offset), "limit": "500"},
            )
            rows.extend(page)
            if len(page) < 500:
                return rows
        raise HTTPException(
            503,
            "Catalog is too large for this ranking mode. Please refine the catalog filters.",
        )


async def live_weather(location):
    params = {"appid": settings().openweather_api_key, "units": "metric"}
    if location.lat is not None:
        params.update(lat=location.lat, lon=location.lon)
    else:
        params["q"] = location.city.strip()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather", params=params
            )
        if response.status_code == 404:
            raise HTTPException(
                422,
                "City not found. Include the city and country code, e.g. Indore,IN.",
            )
        response.raise_for_status()
        data = response.json()
        return {
            "temp": round(data["main"]["temp"], 1),
            "feels_like": round(data["main"]["feels_like"], 1),
            "description": data["weather"][0]["description"],
            "city": data["name"],
            "rain": any(200 <= w["id"] < 700 for w in data["weather"]),
            "humidity": data["main"]["humidity"],
            "wind_mps": data["wind"]["speed"],
            "observed_at": data["dt"],
            "source": "OpenWeatherMap",
        }
    except (httpx.HTTPError, KeyError, ValueError, IndexError):
        raise HTTPException(
            503, "The weather report could not be retrieved. Please retry shortly."
        )
