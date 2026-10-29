import pytest
from app.engine import classify, recommend
from app.schemas import Profile, Location
from pydantic import ValidationError


@pytest.mark.parametrize(
    "s,h,expected",
    [
        (1.2, 1, "shoulder-led"),
        (0.8, 1, "hip-led"),
        (1, 1, "balanced"),
        (1.15, 1, "balanced"),
        (0.9, 1, "balanced"),
    ],
)
def test_classification(s, h, expected):
    assert classify(s, h)[0] == expected


def test_invalid_width():
    with pytest.raises(ValueError):
        classify(1, 0)


BASE = {
    "id": "b",
    "gender": "Men",
    "category": "Blazer",
    "occasions": ["Formal"],
    "min_temp": 10,
    "max_temp": 25,
    "water_resistant": False,
    "body_shapes": ["balanced"],
}


@pytest.mark.parametrize(
    "shape,occasion,temp,rain",
    [
        ("balanced", "Formal", 26, False),
        ("balanced", "Travel", 20, False),
        ("balanced", "Formal", 20, True),
        ("hip-led", "Formal", 20, False),
    ],
)
def test_context_is_ranked_but_occasion_remains_strict(shape, occasion, temp, rain):
    result = recommend([BASE], shape, occasion, {"temp": temp, "rain": rain}, "Men")
    assert bool(result) is (occasion == "Formal")


def test_inclusive_limits():
    assert (
        len(recommend([BASE], "balanced", "Formal", {"temp": 25, "rain": False})) == 1
    )


def test_stable_order_and_rain():
    a = {**BASE, "id": "a", "water_resistant": True}
    b = {**BASE, "water_resistant": True}
    result = recommend([b, a], "balanced", "Formal", {"temp": 20, "rain": True})
    assert [i["id"] for i in result] == ["a", "b"]
    assert "Water-resistant" in result[0]["reasons"]


@pytest.mark.parametrize(
    "data",
    [
        {"lat": 20},
        {"lat": 91, "lon": 75},
        {},
        {"city": " "},
        {"lat": float("nan"), "lon": 75},
    ],
)
def test_location_rejection(data):
    with pytest.raises(ValidationError):
        Location(**data)


def test_profile_rejects_nonfinite():
    with pytest.raises(ValidationError):
        Profile(age=20, height_cm=float("inf"), weight_kg=65, occasion="Casual")


def test_gender_filter_keeps_only_selected_gender():
    men = {**BASE, "id": "men", "gender": "Men"}
    women = {**BASE, "id": "women", "gender": "Women"}
    unisex = {**BASE, "id": "unisex", "gender": "Unisex"}
    weather = {"temp": 20, "rain": False}
    assert [x["id"] for x in recommend([men, women, unisex], "balanced", "Formal", weather, "Men")] == ["men", "unisex"]
    assert [x["id"] for x in recommend([men, women, unisex], "balanced", "Formal", weather, "Women")] == ["unisex", "women"]


def test_occasion_changes_recommendations():
    casual = {**BASE, "id": "casual", "occasions": ["Casual"]}
    formal = {**BASE, "id": "formal", "occasions": ["Formal"]}
    weather = {"temp": 20, "rain": False}
    assert [x["id"] for x in recommend([casual, formal], "balanced", "Casual", weather, "Men")] == ["casual"]
    assert [x["id"] for x in recommend([casual, formal], "balanced", "Formal", weather, "Men")] == ["formal"]


def test_missing_gender_is_not_silently_treated_as_menswear():
    legacy = {key: value for key, value in BASE.items() if key != "gender"}
    assert recommend([legacy], "balanced", "Formal", {"temp": 20, "rain": False}, "Men") == []


def test_mislabeled_saree_never_appears_in_mens_recommendations():
    saree = {**BASE, "id": "saree", "gender": "Unisex", "name": "Purple Silk Saree", "category": "Saree"}
    shirt = {**BASE, "id": "shirt", "gender": "Men", "name": "Oxford Shirt", "category": "Shirt"}
    result = recommend([saree, shirt], "balanced", "Formal", {"temp": 20, "rain": False}, "Men")
    assert [item["id"] for item in result] == ["shirt"]
