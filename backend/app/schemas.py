from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator

Occasion = Literal["Casual", "Formal", "Party", "Work", "Travel", "Active"]
Gender = Literal["Men", "Women"]


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    age: int = Field(ge=18, le=100)
    height_cm: float = Field(ge=100, le=230)
    weight_kg: float = Field(ge=30, le=250)
    occasion: Occasion
    gender: Gender = "Men"


class Location(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    city: str | None = Field(default=None, min_length=2, max_length=100)

    @model_validator(mode="after")
    def complete(self):
        if (self.lat is None) != (self.lon is None):
            raise ValueError("Latitude and longitude must be supplied together")
        if self.lat is None and not (self.city and self.city.strip()):
            raise ValueError("A city or coordinates are required")
        return self
