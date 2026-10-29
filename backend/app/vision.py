"""CPU vision worker. Models are loaded once at process startup, never fetched per request."""

from io import BytesIO
from threading import Lock, BoundedSemaphore
import math
import warnings
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from .engine import classify

Image.MAX_IMAGE_PIXELS = 16_000_000


class VisionError(ValueError):
    pass


class Vision:
    def __init__(self, model_path):
        import mediapipe as mp
        from rembg import new_session

        self.mp = mp
        self.pose = mp.tasks.vision.PoseLandmarker.create_from_options(
            mp.tasks.vision.PoseLandmarkerOptions(
                base_options=mp.tasks.BaseOptions(model_asset_path=model_path),
                running_mode=mp.tasks.vision.RunningMode.IMAGE,
                num_poses=2,
                min_pose_detection_confidence=0.65,
                min_pose_presence_confidence=0.65,
            )
        )
        self.background = new_session("u2netp")
        self.lock = Lock()
        self.capacity = BoundedSemaphore(2)

    def close(self):
        self.pose.close()

    def analyze(self, raw):
        from rembg import remove

        if not self.capacity.acquire(blocking=False):
            raise VisionError("The styling studio is busy. Please retry in a moment.")
        try:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    with Image.open(BytesIO(raw)) as opened:
                        if opened.format not in ("JPEG", "PNG", "WEBP"):
                            raise VisionError("Use a JPEG, PNG, or WebP image.")
                        if min(opened.size) < 256:
                            raise VisionError(
                                "Use an image at least 256 pixels wide and tall."
                            )
                        photo = ImageOps.exif_transpose(opened).convert("RGB")
                        photo.thumbnail((1400, 1800))
            except (
                UnidentifiedImageError,
                OSError,
                Image.DecompressionBombError,
                Image.DecompressionBombWarning,
            ):
                raise VisionError(
                    "The photo is invalid or too large. Use a smaller JPEG, PNG, or WebP."
                )
            # MediaPipe task instances are not shared concurrently across threads.
            with self.lock:
                result = self.pose.detect(
                    self.mp.Image(
                        image_format=self.mp.ImageFormat.SRGB, data=np.asarray(photo)
                    )
                )
                if len(result.pose_landmarks) != 1:
                    raise VisionError(
                        "Please use a clear photo with exactly one person facing the camera."
                    )
                points = result.pose_landmarks[0]
                core = [points[i] for i in (11, 12, 23, 24)]
                if any(
                    min(p.visibility or 0, p.presence or 0) < 0.65
                    or not (0 < p.x < 1 and 0 < p.y < 1)
                    for p in core
                ):
                    raise VisionError(
                        "Both shoulders and hips must be clearly visible. Step back and face forward."
                    )
                # World landmarks use meters; avoid mixing normalized x and y units.
                world = result.pose_world_landmarks[0]
                width = lambda a, b: math.dist(
                    (world[a].x, world[a].y, world[a].z),
                    (world[b].x, world[b].y, world[b].z),
                )
                sw, hw = width(11, 12), width(23, 24)
                if hw < 0.03 or sw < 0.03:
                    raise VisionError(
                        "The pose estimate is unreliable. Try a clearer front-facing photo."
                    )
                if abs(world[11].z - world[12].z) / sw > 0.5:
                    raise VisionError(
                        "Face the camera squarely with both shoulders at the same depth."
                    )
                shape, ratio = classify(sw, hw)
                cutout = remove(photo, session=self.background).convert("RGBA")
            # Fresh image serialization strips EXIF and location metadata.
            output = BytesIO()
            cutout.save(output, format="PNG")
            return {
                "png": output.getvalue(),
                "silhouette": shape,
                "shoulder_hip_ratio": ratio,
                "confidence": round(min(p.visibility for p in core), 3),
                "world_landmarks": [{"x": p.x, "y": p.y, "z": p.z} for p in world],
                "landmarks": [
                    {"x": p.x, "y": p.y, "z": p.z, "visibility": p.visibility}
                    for p in points
                ],
            }
        finally:
            self.capacity.release()
