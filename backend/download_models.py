"""Run explicitly during image build; review upstream model licenses before distribution."""

import os
from pathlib import Path
from urllib.request import urlretrieve
from rembg import new_session

folder = Path(os.environ.get("U2NET_HOME", "/models"))
folder.mkdir(parents=True, exist_ok=True)
urlretrieve(
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    folder / "pose_landmarker_lite.task",
)
new_session("u2netp")
