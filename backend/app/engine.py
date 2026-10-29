"""Deterministic outfit ranking with strict audience/occasion and soft fit context."""


def classify(shoulder_width: float, hip_width: float):
    if shoulder_width <= 0 or hip_width <= 0:
        raise ValueError("Invalid pose widths")
    ratio = shoulder_width / hip_width
    shape = (
        "shoulder-led" if ratio > 1.15 else "hip-led" if ratio < 0.90 else "balanced"
    )
    return shape, round(ratio, 3)



def _gender_compatible(item: dict, gender: str) -> bool:
    """Respect catalog gender and block clearly gender-specific items if data is mislabeled."""
    item_gender = item.get("gender")
    if item_gender not in (gender, "Unisex"):
        return False
    name = str(item.get("name", "")).lower()
    category = str(item.get("category", "")).lower().strip()
    description = str(item.get("description", "")).lower()
    searchable = f"{name} {category} {description}"
    women_only_terms = ("saree", "sari", "lehenga", "salwar kameez", "dupatta", "choli", "anarkali", "women's", "womenswear", "women wear", "women-only")
    women_only_categories = {"saree", "sari", "lehenga", "dupatta", "choli", "anarkali", "gown", "skirt", "women's clothing"}
    men_only_terms = ("men's", "menswear", "men wear", "men-only")
    if gender == "Men" and (category in women_only_categories or any(term in searchable for term in women_only_terms)):
        return False
    if gender == "Women" and any(term in searchable for term in men_only_terms):
        return False
    return True

def recommend(
    catalog: list[dict],
    silhouette: str,
    occasion: str,
    weather: dict,
    gender: str = "Men",
):
    """Keep gender and occasion strict; rank fit/weather context instead of hiding every fallback."""
    if gender not in ("Men", "Women"):
        gender = "Men"

    results = []
    for item in catalog:
        if not _gender_compatible(item, gender):
            continue
        occasions = item.get("occasions") or []
        if occasion not in occasions:
            continue

        min_temp = float(item.get("min_temp", -100))
        max_temp = float(item.get("max_temp", 100))
        temp = float(weather.get("temp", 20))
        midpoint = (min_temp + max_temp) / 2
        temp_distance = abs(temp - midpoint)
        in_temp_range = min_temp <= temp <= max_temp
        shape_match = silhouette in (item.get("body_shapes") or [])
        water_resistant = bool(item.get("water_resistant", False))

        # Weather and proportions improve ranking, but cannot erase every suitable
        # occasion match when the catalog is small.
        score = 100.0
        score += 12 if in_temp_range else max(-18, 12 - abs(temp - min_temp if temp < min_temp else temp - max_temp) * 1.5)
        score += 8 if shape_match else -4
        score += 6 if (not weather.get("rain") or water_resistant) else -10
        # Prefer pieces designed specifically for this occasion over all-purpose basics.
        score += max(0, 5 - len(occasions))
        score -= temp_distance * 0.08
        reasons = [f"Suitable for {occasion.lower()}"]
        reasons.append("Matches your proportions" if shape_match else "Alternative cut to explore")
        if in_temp_range:
            reasons.append(f"Suited to {temp:g}°C")
        else:
            reasons.append("Layer appropriately for today's temperature")
        if weather.get("rain"):
            reasons.append("Water-resistant" if water_resistant else "Add a rain layer")
        results.append({**item, "score": round(score, 2), "reasons": reasons})

    # Keep stable, predictable results while prioritizing score and variety of categories.
    ranked = sorted(results, key=lambda row: (-row["score"], row.get("category", ""), row["id"]))
    chosen = []
    seen_categories = set()
    for row in ranked:
        category = row.get("category", "")
        if category and category not in seen_categories:
            chosen.append(row)
            seen_categories.add(category)
        if len(chosen) == 6:
            break
    if len(chosen) < 6:
        chosen_ids = {row["id"] for row in chosen}
        chosen.extend(row for row in ranked if row["id"] not in chosen_ids and len(chosen) < 6)
    return chosen
