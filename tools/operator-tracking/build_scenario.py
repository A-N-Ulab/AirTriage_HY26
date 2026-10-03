"""Build the static four-person AirTriage scenario from verified keyframes."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


PERSON_IDS = ("person-01", "person-02", "person-03", "person-04")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--keyframes", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    parser.add_argument("--assets-dir", type=Path, required=True)
    return parser.parse_args()


def read_video(path: Path) -> tuple[list[np.ndarray], float, int, int]:
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video: {path}")

    fps = float(capture.get(cv2.CAP_PROP_FPS))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frames: list[np.ndarray] = []

    while True:
        ok, frame = capture.read()
        if not ok:
            break
        frames.append(frame)

    capture.release()
    return frames, fps, width, height


def lerp_box(start: np.ndarray, end: np.ndarray, progress: float) -> np.ndarray:
    return start + (end - start) * progress


def features_in_box(gray: np.ndarray, box: np.ndarray) -> np.ndarray | None:
    x, y, width, height = np.round(box).astype(int)
    mask = np.zeros_like(gray)
    inset_x = max(1, round(width * 0.08))
    inset_y = max(1, round(height * 0.05))
    cv2.rectangle(
        mask,
        (max(0, x + inset_x), max(0, y + inset_y)),
        (min(gray.shape[1] - 1, x + width - inset_x), min(gray.shape[0] - 1, y + height - inset_y)),
        255,
        -1,
    )
    return cv2.goodFeaturesToTrack(
        gray,
        maxCorners=28,
        qualityLevel=0.01,
        minDistance=3,
        mask=mask,
        blockSize=5,
    )


def transform_box(box: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    x, y, width, height = box
    corners = np.array(
        [[[x, y], [x + width, y], [x + width, y + height], [x, y + height]]],
        dtype=np.float32,
    )
    transformed = cv2.transform(corners, matrix)[0]
    left, top = transformed.min(axis=0)
    right, bottom = transformed.max(axis=0)
    return np.array([left, top, right - left, bottom - top], dtype=np.float64)


def optical_track_segment(
    frames: list[np.ndarray], start_index: int, end_index: int, start_box: list[float], end_box: list[float]
) -> list[np.ndarray]:
    start = np.array(start_box, dtype=np.float64)
    end = np.array(end_box, dtype=np.float64)
    if end_index == start_index:
        return [start]

    previous_gray = cv2.cvtColor(frames[start_index], cv2.COLOR_BGR2GRAY)
    points = features_in_box(previous_gray, start)
    current = start.copy()
    raw = [current.copy()]

    for frame_index in range(start_index + 1, end_index + 1):
        next_gray = cv2.cvtColor(frames[frame_index], cv2.COLOR_BGR2GRAY)
        next_points = None
        status = None
        if points is not None and len(points) >= 3:
            next_points, status, _ = cv2.calcOpticalFlowPyrLK(
                previous_gray,
                next_gray,
                points,
                None,
                winSize=(21, 21),
                maxLevel=3,
                criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01),
            )

        if next_points is not None and status is not None:
            good_previous = points[status.flatten() == 1]
            good_next = next_points[status.flatten() == 1]
        else:
            good_previous = np.empty((0, 1, 2), dtype=np.float32)
            good_next = np.empty((0, 1, 2), dtype=np.float32)

        if len(good_previous) >= 3:
            matrix, _ = cv2.estimateAffinePartial2D(
                good_previous,
                good_next,
                method=cv2.RANSAC,
                ransacReprojThreshold=2.5,
            )
            if matrix is not None:
                current = transform_box(current, matrix)

        progress = (frame_index - start_index) / (end_index - start_index)
        expected = lerp_box(start, end, progress)
        current = current * 0.72 + expected * 0.28
        raw.append(current.copy())
        previous_gray = next_gray
        points = features_in_box(previous_gray, current)

    final_error = end - raw[-1]
    corrected = []
    for offset, box in enumerate(raw):
        progress = offset / (len(raw) - 1)
        corrected.append(box + final_error * progress)
    corrected[0] = start
    corrected[-1] = end
    return corrected


def build_boxes(
    frames: list[np.ndarray], keyframes: dict[str, dict[str, list[float] | None]]
) -> list[dict[str, list[float] | None]]:
    boxes = [{person_id: None for person_id in PERSON_IDS} for _ in frames]
    numbered = {int(frame): values for frame, values in keyframes.items()}

    for person_id in PERSON_IDS:
        controls = sorted((frame, values[person_id]) for frame, values in numbered.items())
        for frame, value in controls:
            boxes[frame][person_id] = value

        for (start_frame, start_box), (end_frame, end_box) in zip(controls, controls[1:]):
            if start_box is None or end_box is None:
                continue
            tracked = optical_track_segment(frames, start_frame, end_frame, start_box, end_box)
            for offset, tracked_box in enumerate(tracked):
                boxes[start_frame + offset][person_id] = tracked_box.tolist()

    return boxes


def normalise_box(box: list[float] | None, width: int, height: int) -> list[float] | None:
    if box is None:
        return None
    x, y, box_width, box_height = box
    values = [x / width, y / height, box_width / width, box_height / height]
    return [round(max(0.0, min(1.0, value)), 6) for value in values]


def convert_portraits(people: list[dict], source_dir: Path, assets_dir: Path) -> None:
    assets_dir.mkdir(parents=True, exist_ok=True)
    for person in people:
        source = source_dir / f"{person['id']}.png"
        target = assets_dir / Path(person["image"]).name
        if not source.exists():
            raise FileNotFoundError(f"Missing approved portrait: {source}")
        with Image.open(source) as image:
            image.convert("RGB").thumbnail((720, 960), Image.Resampling.LANCZOS)
            image.save(target, "WEBP", quality=86, method=6)


def render_preview(
    source: Path,
    target: Path,
    boxes: list[dict[str, list[float] | None]],
    fps: float,
    width: int,
    height: int,
) -> None:
    colours = {
        "person-01": (0, 220, 255),
        "person-02": (72, 214, 112),
        "person-03": (72, 214, 112),
        "person-04": (72, 214, 112),
    }
    capture = cv2.VideoCapture(str(source))
    target.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(target), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))

    frame_index = 0
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        for person_id, box in boxes[frame_index].items():
            if box is None:
                continue
            x, y, box_width, box_height = np.round(box).astype(int)
            colour = colours[person_id]
            cv2.rectangle(frame, (x, y), (x + box_width, y + box_height), colour, 3)
            cv2.putText(
                frame,
                person_id,
                (x, max(24, y - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.65,
                colour,
                2,
                cv2.LINE_AA,
            )
        cv2.putText(
            frame,
            f"frame {frame_index:03d}",
            (24, 42),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        writer.write(frame)
        frame_index += 1

    capture.release()
    writer.release()


def main() -> None:
    args = parse_args()
    controls = json.loads(args.keyframes.read_text(encoding="utf-8"))
    frames, fps, width, height = read_video(args.video)
    if (width, height, round(fps), len(frames)) != (1920, 1080, 30, 278):
        raise ValueError(f"Unexpected source metadata: {width}x{height}, {fps} fps, {len(frames)} frames")

    boxes = build_boxes(frames, controls["keyframes"])
    scenario = {
        "video": {"width": width, "height": height, "fps": round(fps), "frameCount": len(frames)},
        "people": controls["people"],
        "frames": [
            {
                "frame": frame_index,
                "boxes": {
                    person_id: normalise_box(frame_boxes[person_id], width, height)
                    for person_id in PERSON_IDS
                },
            }
            for frame_index, frame_boxes in enumerate(boxes)
        ],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(scenario, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    convert_portraits(controls["people"], args.keyframes.parent / "source", args.assets_dir)
    render_preview(args.video, args.preview, boxes, fps, width, height)


if __name__ == "__main__":
    main()
